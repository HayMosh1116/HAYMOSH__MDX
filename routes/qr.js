const { 
    princeId,
    removeFile
} = require('../mayel');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { serializeSessionDirectory } = require('../mayel/sessionPayload');
const { acquireAuthSession } = require('../mayel/sessionLimiter');
let router = express.Router();
const pino = require("pino");
const { sendButtons } = require('gifted-btns');
const {
    default: princeConnect,
    useMultiFileAuthState,
    Browsers,
    delay,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const sessionDir = path.join(__dirname, "session");


router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    const releaseSlot = acquireAuthSession(req.ip);
    if (!releaseSlot) return res.status(429).send('Too many pairing attempts. Wait a few minutes and try again.');
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
                console.error('QR session cleanup error:', cleanupError?.message || cleanupError);
            } finally {
                sessionCleanedUp = true;
                releaseSlot();
            }
        }
    }

    let reconnectCount = 0;
    let intentionalClose = false;
    let reconnecting = false;

    async function PRINCE_QR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        await fs.mkdir(authPath, { recursive: true, mode: 0o700 });
        await fs.chmod(authPath, 0o700);
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        try {
            const Prince = princeConnect({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000
            });
            activeSocket = Prince;

            Prince.ev.on('creds.update', saveCreds);
            Prince.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;
                
                if (qr && !responseSent) {
                    try {
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        res.send(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>HAYMOSH_MDX | QR CODE</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                                <style>
                                    body {
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                        min-height: 100vh;
                                        margin: 0;
                                        background-color: #000;
                                        font-family: Arial, sans-serif;
                                        color: #fff;
                                        text-align: center;
                                        padding: 20px;
                                        box-sizing: border-box;
                                    }
                                    .container {
                                        width: 100%;
                                        max-width: 600px;
                                    }
                                    .qr-container {
                                        position: relative;
                                        margin: 20px auto;
                                        width: 300px;
                                        height: 300px;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                    }
                                    .qr-code {
                                        width: 300px;
                                        height: 300px;
                                        padding: 10px;
                                        background: white;
                                        border-radius: 20px;
                                        box-shadow: 0 0 0 10px rgba(255,255,255,0.1),
                                                    0 0 0 20px rgba(255,255,255,0.05),
                                                    0 0 30px rgba(255,255,255,0.2);
                                    }
                                    .qr-code img {
                                        width: 100%;
                                        height: 100%;
                                    }
                                    h1 {
                                        color: #fff;
                                        margin: 0 0 15px 0;
                                        font-size: 28px;
                                        font-weight: 800;
                                        text-shadow: 0 0 10px rgba(255,255,255,0.3);
                                    }
                                    p {
                                        color: #ccc;
                                        margin: 20px 0;
                                        font-size: 16px;
                                    }
                                    .back-btn {
                                        display: inline-block;
                                        padding: 12px 25px;
                                        margin-top: 15px;
                                        background: linear-gradient(135deg, #6e48aa 0%, #9d50bb 100%);
                                        color: white;
                                        text-decoration: none;
                                        border-radius: 30px;
                                        font-weight: bold;
                                        border: none;
                                        cursor: pointer;
                                        transition: all 0.3s ease;
                                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                                    }
                                    .back-btn:hover {
                                        transform: translateY(-2px);
                                        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                                    }
                                    .pulse {
                                        animation: pulse 2s infinite;
                                    }
                                    @keyframes pulse {
                                        0% {
                                            box-shadow: 0 0 0 0 rgba(255,255,255,0.4);
                                        }
                                        70% {
                                            box-shadow: 0 0 0 15px rgba(255,255,255,0);
                                        }
                                        100% {
                                            box-shadow: 0 0 0 0 rgba(255,255,255,0);
                                        }
                                    }
                                    @media (max-width: 480px) {
                                        .qr-container {
                                            width: 260px;
                                            height: 260px;
                                        }
                                        .qr-code {
                                            width: 220px;
                                            height: 220px;
                                        }
                                        h1 {
                                            font-size: 24px;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>HAYWHY_MDX QR CODE</h1>
                                    <div class="qr-container">
                                        <div class="qr-code pulse">
                                            <img src="${qrImage}" alt="QR Code"/>
                                        </div>
                                    </div>
                                    <p>Scan this QR code with your phone to connect</p>
                                    <a href="./" class="back-btn">Back</a>
                                </div>
                                <script>
                                    document.querySelector('.back-btn').addEventListener('mousedown', function(e) {
                                        this.style.transform = 'translateY(1px)';
                                        this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                                    });
                                    document.querySelector('.back-btn').addEventListener('mouseup', function(e) {
                                        this.style.transform = 'translateY(-2px)';
                                        this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                                    });
                                </script>
                            </body>
                            </html>
                        `);
                        responseSent = true;
                    }
                    } catch (qrError) {
                        console.error('QR rendering failed:', qrError?.message || qrError);
                        if (!res.headersSent) res.status(500).json({ error: 'Unable to render pairing QR code.' });
                        responseSent = true;
                        await cleanUpSession();
                    }
                }

                if (connection === "open") {
                    await delay(10000);

                    try {
                        const sessionToken = await serializeSessionDirectory(authPath);
                        await sendButtons(Prince, Prince.user.id, {
            title: '',
            text: sessionToken,
            footer: `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ  ‎⁨👾𝒟𝐸𝒱-𝐻𝒜𝒴𝒲𝐻𝒴//𝒯𝐸𝒞𝐻🤖⁩*`,
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
                        url: 'https://github.com/HayMosh1116/HAYMOSH_MDX/'
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

                        await delay(2000);
                        intentionalClose = true;
                        await Prince.ws.close();
                    } catch (sendError) {
                        console.error("Error sending session:", sendError);
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
                        console.log('QR reconnecting... attempt ' + reconnectCount + '/3');
                        await delay(10000);
                        reconnecting = false;
                        try {
                            await PRINCE_QR_CODE();
                        } catch (reconnectError) {
                            console.error('QR reconnect failed:', reconnectError?.message || reconnectError);
                            if (!responseSent && !res.headersSent) {
                                res.status(502).send('QR pairing service is temporarily unavailable.');
                                responseSent = true;
                            }
                            await cleanUpSession();
                        }
                    } else {
                        console.log('QR max reconnect attempts reached.');
                        if (!responseSent && !res.headersSent) {
                            res.status(500).json({ code: 'QR Service is Currently Unavailable' });
                            responseSent = true;
                        }
                        await cleanUpSession();
                    }
                }
            });
        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent) {
                res.status(500).json({ code: "QR Service is Currently Unavailable" });
                responseSent = true;
            }
            await cleanUpSession();
        }
    }

    try {
        sessionTimeout = setTimeout(async () => {
            intentionalClose = true;
            if (!responseSent && !res.headersSent) {
                res.status(408).send('QR pairing session expired. Start a new request.');
                responseSent = true;
            }
            try { await activeSocket?.ws?.close(); } catch (_) {}
            await cleanUpSession();
        }, 180000);
        sessionTimeout.unref?.();
        await PRINCE_QR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;
