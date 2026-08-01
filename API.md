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

## Step Sequences (three-dot menu "Step 2" / "Step 3" / any future step)

Lets the admin pre-configure an ordered list of messages/media per "step" from the
dashboard, then fire the whole thing at a chat with one click (with a delay between
each item so it doesn't all land at once).

### `GET /sequences`
List every step template (Step 2, Step 3, and any custom ones added later), each with its `items` array.

### `GET /sequences/:stepKey`
Get one step template.

### `PUT /sequences/:stepKey`
Body: `{ "name"?: "...", "delay_ms"?: 700 }`. Creates the step if `stepKey` doesn't exist yet (`name` required in that case) — this is how new steps like "Step 4" get added. Otherwise updates its name/delay.

### `DELETE /sequences/:stepKey`
Deletes the whole step and its stored media.

### `POST /sequences/:stepKey/items`
Multipart form: `type` (`text`|`photo`|`audio`|`video`|`document`), `text` (message body or caption), `order`?, `file` (required for non-text types). Appends a new item.

### `PUT /sequences/:stepKey/items/:itemId`
Multipart form, all fields optional: `text`, `order`, `file` (replaces the media, invalidating the cached Telegram `file_id`).

### `PUT /sequences/:stepKey/items/reorder`
Body: `{ "order": [itemId, itemId, ...] }` — full new ordering.

### `DELETE /sequences/:stepKey/items/:itemId`
Removes one item (and its stored file, if any).

### `GET /sequences/items/:itemId/asset?token=<JWT>`
Streams the item's stored media, for dashboard preview only (accepts the token as a query param like `/files/:fileId` does, since `<img>`/`<audio>` can't set headers).

### `POST /sequences/:stepKey/send/:chatId`
Triggers the step for one chat — this is what the three-dot menu calls. Responds immediately once validated (`{ success, queued: true, total }`), then sends every configured item to the user one at a time in the background, with `delay_ms` between each. Each item lands through the normal `Message` + `message:new` socket path, so it appears live in any open dashboard tab exactly like a normal reply. Unconfigured item slots (empty text, or a media slot with nothing uploaded yet) are silently skipped rather than sent blank.

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
