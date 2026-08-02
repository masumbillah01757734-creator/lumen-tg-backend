// One-off script: fills in profile_photo_file_id for users already in the DB
// (created before the getUserProfilePhotos type-mismatch fix, or who happened
// to hit the old bug). New users get this automatically on their next message,
// but existing ones won't until they message again — run this once to backfill.
//
// Usage:  node scripts/backfillProfilePhotos.js

require("dotenv").config();
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const telegramService = require("../src/services/telegramService");

async function run() {
    await connectDB();

    const users = await User.find({});
    console.log(`[Backfill] Checking ${users.length} user(s)...`);

    let updated = 0;
    for (const user of users) {
        try {
            const photoFileId = await telegramService.getUserProfilePhotoFileId(user.chat_id);
            if (photoFileId && photoFileId !== user.profile_photo_file_id) {
                user.profile_photo_file_id = photoFileId;
                await user.save();
                updated += 1;
                console.log(`[Backfill] ${user.chat_id}: photo set`);
            }
        } catch (err) {
            console.error(`[Backfill] ${user.chat_id}: failed —`, err.message);
        }
    }

    console.log(`[Backfill] Done. Updated ${updated}/${users.length} user(s).`);
    process.exit(0);
}

run();