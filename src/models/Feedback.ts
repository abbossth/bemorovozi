import { Schema, model, models, type InferSchemaType } from "mongoose";

const FeedbackSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    channel: { type: String, enum: ["text", "voice"], required: true },
    transcript: { type: String, required: true },
    aiSummary: { type: String, required: true },
    severity: { type: String, enum: ["past", "orta", "yuqori"], required: true, index: true },
    status: {
      type: String,
      enum: ["yangi", "korib_chiqilmoqda", "hal_qilindi"],
      default: "yangi",
      index: true,
    },
    trackingCode: { type: String, required: true, unique: true },
    // Normalized short tag from the AI classifier (e.g. "dori_vaqtida_berilmadi") —
    // feedback sharing a tag + department within a rolling window renders as one
    // cluster on the dashboard instead of a vector-similarity pipeline.
    issueTag: { type: String, required: true, index: true },
    // Where the submission came from. Never carries any Telegram-identifying data —
    // the patient bot deliberately never writes chat_id/user_id anywhere.
    source: { type: String, enum: ["web", "telegram"], default: "web" },
    // Fields of the confirmed card from the AI conversation (web chat/voice). All optional —
    // Telegram and older documents don't have them.
    kind: { type: String, enum: ["shikoyat", "taklif"], default: "shikoyat" },
    roomOrWard: { type: String },
    staffName: { type: String },
    occurredAt: { type: String }, // "when", as the patient described it ("Bugun, tushdan keyin")
    // Who is handling / who resolved it (full names of Staff; shown shortened in the panel).
    reviewedByName: { type: String },
    resolvedByName: { type: String },
    // Staff-conduct complaints skip the department and notify management directly.
    routedToManagement: { type: Boolean, default: false },
    // The full back-and-forth (assistant + patient). `transcript` keeps only the patient's own words.
    conversation: {
      type: [{ _id: false, role: { type: String, enum: ["assistant", "patient"] }, text: String }],
      default: undefined,
    },
  },
  { timestamps: true }
);

export type Feedback = InferSchemaType<typeof FeedbackSchema> & { _id: string };

export default models.Feedback || model("Feedback", FeedbackSchema);
