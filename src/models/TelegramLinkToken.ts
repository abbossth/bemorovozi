import { Schema, model, models } from "mongoose";

// One-time token used as the /start payload for the staff bot's deep link
// (t.me/<bot>?start=<token>). Consumed on first use and expires quickly —
// this is scoped to the staff member's OWN account (Firebase-authenticated),
// nothing to do with the patient bot's anonymity requirement.
const TelegramLinkTokenSchema = new Schema({
  token: { type: String, required: true, unique: true },
  staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
});

TelegramLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.TelegramLinkToken || model("TelegramLinkToken", TelegramLinkTokenSchema);
