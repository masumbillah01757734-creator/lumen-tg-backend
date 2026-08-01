const Sequence = require("../models/Sequence");

/**
 * Creates the two required Step templates (Step 2 / Step 3) with the exact item
 * slots requested, left empty for the admin to fill in from the dashboard. Safe to
 * run on every boot — it only inserts a step_key that doesn't exist yet, and never
 * touches/overwrites one that's already been configured.
 *
 * Adding a further Step 4, Step 5, etc. later does NOT require touching this file —
 * that's done live from the Admin Dashboard's "Add step" button.
 */
async function ensureDefaultSequences() {
  const defaults = [
    {
      step_key: "step2",
      name: "Step 2",
      delay_ms: 700,
      items: [
        { order: 1, type: "text", text: "" },
        { order: 2, type: "text", text: "" },
        { order: 3, type: "text", text: "" },
        { order: 4, type: "text", text: "" },
        { order: 5, type: "text", text: "" },
        { order: 6, type: "audio", text: "" },
        { order: 7, type: "text", text: "" },
        { order: 8, type: "photo", text: "" },
        { order: 9, type: "photo", text: "" },
        { order: 10, type: "text", text: "" },
      ],
    },
    {
      step_key: "step3",
      name: "Step 3",
      delay_ms: 700,
      items: [
        { order: 1, type: "text", text: "" },
        { order: 2, type: "text", text: "" },
        { order: 3, type: "text", text: "" },
        { order: 4, type: "text", text: "" },
        { order: 5, type: "text", text: "" },
        { order: 6, type: "video", text: "" },
        { order: 7, type: "audio", text: "" },
        { order: 8, type: "document", text: "" },
        { order: 9, type: "text", text: "" },
      ],
    },
  ];

  for (const def of defaults) {
    const exists = await Sequence.findOne({ step_key: def.step_key }).lean();
    if (!exists) {
      await Sequence.create(def);
      console.log(`[Sequences] Seeded default "${def.step_key}" template`);
    }
  }
}

module.exports = { ensureDefaultSequences };
