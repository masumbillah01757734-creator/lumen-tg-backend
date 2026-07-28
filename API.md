# API Documentation

Base URL: `{NEXT_PUBLIC_API_URL}` e.g. `https://api.yourdomain.com/api`

All routes except `/auth/login` and `/telegram/webhook` require:
```
Authorization: Bearer <JWT token>
```
(File routes also accept the token as `?token=` query param, since `<img>`/`<video>` tags can't set headers.)

---

## Auth

### `POST /auth/login`
Body: `{ "email": "admin@example.com", "password": "..." }`
Response: `{ "success": true, "token": "...", "admin": { "email": "..." } }`
Rate-limited to 10 attempts / 15 min per IP.

### `GET /auth/me`
Returns the decoded admin info from the JWT.

---

## Telegram

### `POST /telegram/webhook`
Called by Telegram, not by the dashboard. Requires header `X-Telegram-Bot-Api-Secret-Token` matching `WEBHOOK_SECRET`. Always responds `200 OK` immediately, processes the update async.

---

## Chats

### `GET /chats?search=&archived=false`
List chats (users), each with an attached `last_message`. Pinned chats first, then most recent.

### `GET /chats/blocked`
List all currently blocked users.

### `GET /chats/:chatId`
Get a single chat/user record.

### `POST /chats/:chatId/read`
Marks all unread messages from that user as read, resets `unread_count` to 0.

### `POST /chats/:chatId/pin`
Toggles `is_pinned`.

### `POST /chats/:chatId/archive`
Toggles `is_archived`.

### `DELETE /chats/:chatId`
Permanently deletes the user and all their messages from MongoDB.

### `POST /chats/:chatId/block`
Body: `{ "reason": "optional string" }`
Sets `is_blocked=true`, records `blocked_at`. Future incoming messages from this `chat_id` are rejected by the webhook handler before being saved.

### `POST /chats/:chatId/unblock`
Sets `is_blocked=false`, clears reason/timestamp.

---

## Messages

### `GET /messages/:chatId?before=<ISO date>&limit=30`
Returns messages for a chat, oldest→newest, for pagination pass `before` = the date of the oldest message you already have.

### `POST /messages/:chatId`
Body: `{ "text": "..." }`
Sends a text reply via the Telegram Bot API (`sendMessage`) and saves/broadcasts it.

---

## Files

### `GET /files/:fileId?token=<JWT>`
Resolves the Telegram `file_id` via `getFile`, then **streams** the actual bytes straight from Telegram's file servers through this endpoint to the browser. Nothing is written to disk, S3, Cloudinary, or R2 — every request re-resolves and re-streams live.

---

## Socket.IO Events

Connect with `auth: { token: <JWT> }`.

**Server → Client**
| Event | Payload | Description |
|---|---|---|
| `message:new` | `Message` | New message (incoming from user or outgoing from admin) |
| `user:update` | `User` | User/chat fields changed (pin, archive, unread_count, etc.) |
| `user:typing` | `{ chat_id, typing }` | Telegram-side typing chat action (best-effort, see README) |
| `admin:typing` | `{ chat_id, typing }` | Broadcast to other open admin tabs |
| `user:block-status` | `{ chat_id, is_blocked }` | Block/unblock synced live across tabs |
| `chat:deleted` | `{ chat_id }` | A chat was deleted |
| `chat:read` | `{ chat_id }` | Broadcast when another tab marks a chat read |

**Client → Server**
| Event | Payload | Description |
|---|---|---|
| `admin:typing` | `{ chat_id, typing }` | Admin is typing a reply |
| `chat:read` | `{ chat_id }` | Admin marked a chat as read |
