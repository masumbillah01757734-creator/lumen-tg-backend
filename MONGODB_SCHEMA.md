# MongoDB Collection Structure

Database name: whatever's in your `MONGODB_URI` path (e.g. `telegram_dashboard`).

## Collection: `users`
One document per Telegram chat/user.

| Field | Type | Notes |
|---|---|---|
| `chat_id` | String | Telegram chat id, unique, indexed |
| `username` | String \| null | Telegram `@username`, may not exist |
| `first_name` | String | |
| `last_name` | String | |
| `profile_photo_file_id` | String \| null | Telegram file_id only — no image ever stored |
| `last_seen` | Date | Updated on every inbound message |
| `is_online` | Boolean | Reserved; Telegram Bot API doesn't expose real presence (see README) |
| `is_typing` | Boolean | Reserved for future use |
| `unread_count` | Number | Incremented on inbound message, reset via "mark as read" |
| `is_pinned` | Boolean | |
| `is_archived` | Boolean | |
| `is_blocked` | Boolean | Blocked users' new messages are rejected by the webhook handler |
| `block_reason` | String \| null | Optional, set when blocking |
| `blocked_at` | Date \| null | |
| `createdAt` / `updatedAt` | Date | Auto (timestamps) |

Text index on `username`, `first_name`, `last_name` for search.

## Collection: `messages`
One document per message, in either direction.

| Field | Type | Notes |
|---|---|---|
| `chat_id` | String | Indexed, links to `users.chat_id` |
| `sender` | "user" \| "admin" | |
| `receiver` | "user" \| "admin" | |
| `message_type` | "text" \| "photo" \| "video" \| "audio" \| "voice" \| "sticker" \| "animation" \| "document" | |
| `text` | String | Message text, or caption for media |
| `file_id` | String \| null | Telegram file_id — the *only* file reference ever stored |
| `file_unique_id` | String \| null | Telegram's stable unique identifier for the file |
| `file_name` | String \| null | For documents/videos/audio when Telegram provides one |
| `mime_type` | String \| null | |
| `telegram_message_id` | Number \| null | Telegram's own message id |
| `date` | Date | Message timestamp |
| `is_read` | Boolean | |
| `createdAt` / `updatedAt` | Date | Auto (timestamps) |

Compound index on `{ chat_id: 1, date: 1 }` for fast conversation loading.

No other collections exist. Admin login is a single set of credentials from environment variables (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), not a database table — there's exactly one admin in this system per the brief.
