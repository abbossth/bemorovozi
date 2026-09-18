import { Schema, model, models, type InferSchemaType } from "mongoose";

const StaffSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
    // Set once the staff member links their Telegram account via the deep-link
    // flow in Sozlamalar. This is their own account, linked to their own Firebase
    // identity — unlike the patient bot, no anonymity requirement applies here.
    telegramChatId: { type: Number, index: true, sparse: true, unique: true },
    telegramNotificationMode: { type: String, enum: ["realtime", "digest"], default: "realtime" },
    // "Yuqori" severity always notifies immediately regardless of this mode — it
    // only governs orta/past items and the digest cron's watermark.
    telegramLastDigestAt: { type: Date },
  },
  { timestamps: true }
);

export type Staff = InferSchemaType<typeof StaffSchema> & { _id: string };

export default models.Staff || model("Staff", StaffSchema);
