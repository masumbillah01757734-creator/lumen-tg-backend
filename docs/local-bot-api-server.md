# Large files (>50MB) via a self-hosted Local Bot API Server

Telegram's public cloud Bot API caps a bot at **50MB uploads / 20MB downloads**,
no matter what your own server's limits are. The only way around that is to run
Telegram's own **Local Bot API Server** binary yourself — it raises both limits to
**2GB**. This doc walks through deploying it on Railway alongside this backend.

## 1. Get an `api_id` / `api_hash`

The local server needs these in addition to your bot token (the cloud API doesn't
require them, but the local one does):

1. Go to https://my.telegram.org → log in with your own phone number.
2. **API development tools** → create an app (any name/description is fine).
3. Copy the **App api_id** and **App api_hash** shown — you'll need both below.

## 2. Deploy the local server as a second Railway service

In your existing Railway project:

1. **+ New → Empty Service** (don't attach a repo — we'll deploy an image).
2. Set the service to deploy from the public Docker image
   `aiogram/telegram-bot-api:latest` (or `tdlib/telegram-bot-api` — either
   community/official image works; check Railway's "Deploy from Docker image"
   option under Settings → Source).
3. Add these environment variables to that service:
   ```
   TELEGRAM_API_ID=<your api_id>
   TELEGRAM_API_HASH=<your api_hash>
   TELEGRAM_LOCAL=1
   ```
4. Under **Settings → Networking**, expose the service **internally only** on
   port `8081` (no need for a public domain — only your backend service should
   talk to it). Railway gives internal services a private hostname like
   `telegram-bot-api.railway.internal`.
5. Add a **volume** mounted at `/var/lib/telegram-bot-api` so uploaded files
   survive restarts/redeploys instead of living only in the container's
   ephemeral disk.
6. Deploy. Check the logs — it should say it's listening on `0.0.0.0:8081`.

## 3. Point this backend at it

In the **backend** service's environment variables:

```
TELEGRAM_API_ROOT=http://telegram-bot-api.railway.internal:8081
MAX_UPLOAD_MB=2000
```

Redeploy the backend. That's it — `src/services/telegramService.js` already
reads `TELEGRAM_API_ROOT` and falls back to the public cloud API if it's unset,
so this is a safe, reversible change (just unset it to go back to normal).

## 4. Re-point the webhook (important)

Telegram still delivers *incoming* updates the same way, but once you're using
a local server you should set the webhook **through the local server**, not
directly against `api.telegram.org`, so both directions go through the same
place. The app's existing `/api/telegram/webhook` setup flow calls
`setWebhook()` in `telegramService.js` — since that now respects
`TELEGRAM_API_ROOT`, no code change is needed, just redeploy after step 3 and
re-trigger whatever route/script calls `setWebhook`.

## 5. Verify

- Upload a >50MB (but <2GB) zip to a sequence item from the dashboard — it
  should succeed instead of hitting the old "File too large" error.
- Run the sequence against a test chat — the item should arrive in Telegram
  as a normal document.
- Check the local server's logs/volume usage occasionally; files it has
  fully processed don't need to be kept by you (this app's own
  `services/sequenceStorage.js` is the permanent copy).

## Notes / gotchas

- **Cost**: the local server is a second always-on Railway service — factor
  that into your plan's usage.
- **Downloads** (e.g. `resolveFileUrl`/`getFile` for previewing what a
  *Telegram user* sent you) also get the 2GB ceiling once this is live —
  previously anything over 20MB silently failed.
- If `TELEGRAM_API_ROOT` is ever unreachable (service down, wrong internal
  hostname), calls will fail with a connection error, not silently fall back
  to the cloud API — keep an eye on backend logs after deploying.
