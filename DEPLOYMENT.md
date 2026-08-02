# Deployment Guide

## Overview

- **Backend**: any Node host that supports long-lived processes + WebSockets (Socket.IO needs persistent connections — avoid purely serverless/edge platforms for it). Good fits: Railway, Render, a VPS (DigitalOcean/Hetzner) with PM2, or Fly.io.
- **Frontend**: Vercel (native Next.js support) or any Node host that can run `next build && next start`.
- **Database**: MongoDB Atlas (free M0 tier is enough to start).
- Telegram **requires HTTPS** for webhooks — plan for a domain + TLS cert (most PaaS providers give you this for free) on the backend.

## 1. MongoDB Atlas

1. Create a free cluster at cloud.mongodb.com.
2. Database Access → add a user with a strong password.
3. Network Access → allow your backend host's IP (or `0.0.0.0/0` if your host uses dynamic IPs, tightened later with your provider's static IP add-on).
4. Copy the connection string into `MONGODB_URI`.

## 2. Backend deployment (example: Render)

1. Push `backend/` to its own Git repo (or a subfolder repo).
2. New Web Service on Render → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all backend `.env` variables in Render's Environment settings — **never** commit `.env`.
5. Once deployed, note your service URL, e.g. `https://tg-dashboard-api.onrender.com`.
6. Register the webhook once:
   ```bash
   BACKEND_PUBLIC_URL=https://tg-dashboard-api.onrender.com npm run set-webhook
   ```
   (Run this locally with the same `BOT_TOKEN`/`WEBHOOK_SECRET` as production, or as a one-off job on the host.)
7. Confirm it worked:
   ```bash
   curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
   ```

## 3. Frontend deployment (example: Vercel)

1. Push `frontend/` to its own repo.
2. Import into Vercel, framework preset "Next.js" (auto-detected).
3. Add environment variables: `NEXT_PUBLIC_API_URL` (your backend `/api` URL) and `NEXT_PUBLIC_SOCKET_URL` (your backend root URL).
4. Deploy. Update the backend's `CLIENT_URL` to this Vercel URL and redeploy the backend (needed for CORS + email "Dashboard Link").

## 4. Gmail App Password

1. Enable 2-Step Verification on the Gmail account you'll send from.
2. Google Account → Security → App Passwords → generate one for "Mail".
3. Put that 16-character password in `SMTP_PASS` (not your real Gmail password).

## 5. Post-deploy checklist

- [ ] Send a test message to your bot from a Telegram account → confirm it appears instantly in the dashboard.
- [ ] Reply from the dashboard → confirm it arrives in Telegram.
- [ ] Close all dashboard tabs, send another test message → confirm you get an email notification.
- [ ] Test block/unblock, pin, archive, delete, search.
- [ ] Rotate `JWT_SECRET` and `WEBHOOK_SECRET` to long random values before going live (don't reuse the placeholders).
- [ ] Restrict MongoDB Atlas network access to your backend host's IP once you know it.

## 6. Updating the webhook later

If your backend domain ever changes, re-run:
```bash
BACKEND_PUBLIC_URL=https://new-domain.com npm run set-webhook
```
Telegram will start sending updates to the new URL immediately.
