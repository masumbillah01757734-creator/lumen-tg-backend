# /start welcome voice

Drop your voice file here as `welcome.ogg` (Telegram's native voice format —
.ogg with Opus codec — works best; .mp3 also works fine).

Want a different filename or location? Set `START_VOICE_PATH` in your `.env` to
the full path instead.

The first time someone sends /start after a server restart, this file is uploaded
to Telegram once. Its returned file_id is then cached in memory, so every /start
after that is instant and doesn't re-upload the file.
