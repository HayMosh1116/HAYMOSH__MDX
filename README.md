# PRINCE-Session-Generator

> WhatsApp session generator for **PRINCE-MDX** and any Baileys-based bot.  
> Supports **pair code** and **QR code** login, with session data delivered directly to your WhatsApp.

<a href='https://github.com/Mayelprince/PRINCE-MDXI/fork' target="_blank">
  <img alt='FORK REPO' src='https://img.shields.io/badge/-FORK REPO-black?style=for-the-badge&logo=github&logoColor=white'/>
</a>

---

## Features

- 🔗 **Pair Code login** — no QR scan needed, enter code in WhatsApp → Linked Devices
- 📷 **QR Code login** — traditional QR scan
- 🗜️ **Long session** — full zlib/base64 inline string (works anywhere, no DB needed)
- ⚡ Session data sent directly to your WhatsApp number after authentication

---

## Environment Variables

Set these in your hosting dashboard or `.env` file:

| Variable | Required | Description |
|---|---|---|
| `PORT` | Optional | Port to listen on. Default: `5000` |

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /` | Home landing page |
| `GET /pair` | Pair code login page |
| `GET /qr` | Generates and displays QR code |
| `GET /code?number=2547xxx` | Returns pair code JSON `{ code }` |
| `GET /health` | Server health status |

---

## Session format and bot integration

New sessions use the versioned `HAYWHY_MDX2!` format. The compressed payload contains the complete Baileys multi-file authentication state: `creds.json` **and** Signal/app-state key files. The matching HAYMOSH bot loader restores these files into its private `mayel/session` directory and preserves the evolving keys on reconnect. Do not use the old example that writes only `creds.json`; that omits required Signal keys.

For the HAYMOSH bot, copy the complete generated token into the `SESSION_ID` environment variable. Keep it private like a password: anyone holding it may be able to use the linked WhatsApp session. Do not paste it into source code, issue trackers, logs, or public chats. The bot's session directory is local state and must not be committed.

Older `HAYWHY_MDX!` and `PRINCE-MDX!` single-credentials tokens remain accepted by the bot for migration, but they do not contain Signal keys and may not restore a usable session. Generate a new session for reliable use.

Each pairing attempt is limited to three minutes; the service permits at most three live sessions at once and throttles repeated requests. QR images and pairing-code responses are marked `no-store` to discourage caching.

### Example environment

```env
SESSION_ID=HAYWHY_MDX2!<complete-generated-token>
```

---

## Deployment

<a href='https://dashboard.heroku.com/new?template=https://github.com/Mayelprince/PRINCE-MDXI' target="_blank">
  <img alt='HEROKU DEPLOY' src='https://img.shields.io/badge/-HEROKU DEPLOY-black?style=for-the-badge&logo=heroku&logoColor=white'/>
</a>
<br>
<a href='https://dashboard.render.com' target="_blank">
  <img alt='DEPLOY TO RENDER' src='https://img.shields.io/badge/-DEPLOY TO RENDER-black?style=for-the-badge&logo=render&logoColor=white'/>
</a>
<br>
<a href='https://app.koyeb.com' target="_blank">
  <img alt='DEPLOY TO KOYEB' src='https://img.shields.io/badge/-DEPLOY TO KOYEB-black?style=for-the-badge&logo=koyeb&logoColor=white'/>
</a>

---

## Owner

<a href="https://github.com/Mayelprince">
  <img src="https://github.com/Mayelprince.png" width="150" height="150" alt="Mayel Prince" style="border-radius:50%"/>
</a>

[`ℹ️ Visit Bot Repo`](https://github.com/Mayelprince/PRINCE-MDXI)

---

## Join the Community

<a href='https://whatsapp.com/channel/0029VbCKzJ66hENmMeROfT0e' target="_blank">
  <img alt='JOIN WACHANNEL' src='https://img.shields.io/badge/-JOIN WACHANNEL-black?style=for-the-badge&logo=whatsapp&logoColor=white'/>
</a>

---

## Repo Star History

[![PRINCE-Session](https://api.star-history.com/svg?repos=Mayelprince/PRINCE-MDXI&type=Timeline)](#)
