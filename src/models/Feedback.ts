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
  },
  { timestamps: true }
);

export type Feedback = InferSchemaType<typeof FeedbackSchema> & { _id: string };

export default models.Feedback || model("Feedback", FeedbackSchema);
