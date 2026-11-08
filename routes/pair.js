const { 
    princeId,
    removeFile,
    generateRandomCode
} = require('../mayel');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { serializeSessionDirectory } = require('../mayel/sessionPayload');
const { acquireAuthSession } = require('../mayel/sessionLimiter');
let router = express.Router();
const pino = require("pino");
const { sendButtons } = require('gifted-btns');
const {
    default: princeConnect,
    useMultiFileAuthState,
    delay,
    downloadContentFromMessage, 
    generateWAMessageFromContent,
    normalizeMessageContent,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    const num = typeof req.query.number === 'string' ? req.query.number.replace(/\D/g, '') : '';
    if (!/^\d{10,15}$/.test(num)) {
        return res.status(400).json({ error: 'Enter a valid phone number with country code (10–15 digits).' });
    }
    const releaseSlot = acquireAuthSession(req.ip);
    if (!releaseSlot) return res.status(429).json({ error: 'Too many pairing attempts. Wait a few minutes and try again.' });
    const id = princeId();
    const authPath = path.join(sessionDir, id);
    let responseSent = false;
    let sessionCleanedUp = false;
    let sessionTimeout;
    let activeSocket;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            clearTimeout(sessionTimeout);
            if (activeSocket && !intentionalClose) {
                intentionalClose = true;
                try { await activeSocket.ws.close(); } catch (_) {}
            }
            try {
                await removeFile(authPath);
            } catch (cleanupError) {
                console.error("Cleanup error:", cleanupError);
            } finally {
                sessionCleanedUp = true;
                releaseSlot();
            }
        }
    }

    let reconnectCount = 0;
    let intentionalClose = false;
    let reconnecting = false;

    async function PRINCE_PAIR_CODE() {
    const { version } = await fetchLatestBaileysVersion();
        await fs.mkdir(authPath, { recursive: true, mode: 0o700 });
        await fs.chmod(authPath, 0o700);
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        try {
            const Prince = princeConnect({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
                syncFullHistory: false,
                generateHighQualityLinkPreview: true,
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
                getMessage: async () => undefined,
                markOnlineOnConnect: true,
                connectTimeoutMs: 60000, 
                keepAliveIntervalMs: 30000
            });
            activeSocket = Prince;

            Prince.ev.on('creds.update', saveCreds);
            Prince.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    //await Prince.groupAcceptInvite("GbExMqh1hXOFLIJlUyrF8f");
 
                    
                    try {
                        await delay(10000);
                        const sessionToken = await serializeSessionDirectory(authPath);
                        await delay(5000); 

                        let sessionSent = false;
                        let sendAttempts = 0;
                        const maxSendAttempts = 5;
                        while (sendAttempts < maxSendAttempts && !sessionSent) {
                            try {
                                await sendButtons(Prince, Prince.user.id, {
            title: '',
            text: sessionToken,
            footer: `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ‎⁨👾𝒟𝐸𝒱-𝐻𝒜𝒴𝒲𝐻𝒴//𝒯𝐸𝒞𝐻🤖⁩*`,
            buttons: [
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: 'Copy Session', 
                    copy_code: sessionToken
                    }) 
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Visit Bot Repo',
                        url: 'https://github.com/Mayelprince/PRINCE-MDXI'
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Join WaChannel',
                        url: 'https://whatsapp.com/channel/0029Vb7wmowCxoAtmEmCe11x'
                    })
                }
            ]
        });
                                sessionSent = true;
                            } catch (sendError) {
                                console.error("Send error:", sendError);
                                sendAttempts++;
                                if (sendAttempts < maxSendAttempts) {
                                    await delay(3000);
                                }
                            }
                        }

                        if (!sessionSent) {
                            await cleanUpSession();
                            return;
                        }

                        await delay(3000);
                        intentionalClose = true;
                        await Prince.ws.close();
                    } catch (sessionError) {
                        console.error("Session processing error:", sessionError);
                    } finally {
                        await cleanUpSession();
                    }
                    
                } else if (connection === "close" && !intentionalClose) {
                    const closeCode = lastDisconnect?.error?.output?.statusCode;
                    if (closeCode === 401) {
                        if (!responseSent && !res.headersSent) {
                            res.status(502).json({ error: 'WhatsApp rejected this pairing attempt. Please try again.' });
                            responseSent = true;
                        }
                        await cleanUpSession();
                        return;
                    }
                    if (reconnecting) return;
                    if (reconnectCount < 3) {
                        reconnecting = true;
                        reconnectCount++;
                        console.log('Reconnecting... attempt ' + reconnectCount + '/3');
                        await delay(5000);
                        reconnecting = false;
                        try {
                            await PRINCE_PAIR_CODE();
                        } catch (reconnectError) {
                            console.error('Pair reconnect failed:', reconnectError?.message || reconnectError);
                            if (!responseSent && !res.headersSent) {
                                res.status(502).json({ error: 'Pairing service is temporarily unavailable.' });
                                responseSent = true;
                            }
                            await cleanUpSession();
                        }
                    } else {
                        console.log('Max reconnect attempts reached, giving up.');
                        if (!responseSent && !res.headersSent) {
                            res.status(500).json({ code: 'Service is Currently Unavailable' });
                            responseSent = true;
                        }
                        await cleanUpSession();
                    }
                }
            });

            if (!Prince.authState.creds.registered) {
                await delay(1500);
                const code = await Prince.requestPairingCode(num, generateRandomCode());
                if (!responseSent && !res.headersSent) {
                    res.json({ code });
                    responseSent = true;
                }
            }

        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent && !res.headersSent) {
                res.status(500).json({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
            await cleanUpSession();
        }
    }

    try {
        sessionTimeout = setTimeout(async () => {
            intentionalClose = true;
            if (!responseSent && !res.headersSent) {
                res.status(408).json({ error: 'Pairing session expired. Start a new request.' });
                responseSent = true;
            }
            try { await activeSocket?.ws?.close(); } catch (_) {}
            await cleanUpSession();
        }, 180000);
        sessionTimeout.unref?.();
        await PRINCE_PAIR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent && !res.headersSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;
