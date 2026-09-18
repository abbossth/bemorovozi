import { Schema, model, models } from "mongoose";

// Tracks every copy of a staff notification sent for a given Feedback (one per
// linked staff member in that department). When any one of them taps a button,
// we look up all rows for that feedbackId and edit every other copy too, so
// the whole team sees "✅ <Name> tomonidan ko'rib chiqildi" instead of acting twice.
const TelegramNotificationSchema = new Schema(
  {
    feedbackId: { type: Schema.Types.ObjectId, ref: "Feedback", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    chatId: { type: Number, required: true },
    messageId: { type: Number, required: true },
    // The notification text before any "✅ handled by ..." line is appended —
    // kept so every copy can be re-rendered consistently when one is acted on.
    baseText: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.TelegramNotification || model("TelegramNotification", TelegramNotificationSchema);
