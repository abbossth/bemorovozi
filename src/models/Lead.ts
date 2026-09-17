import { Schema, model, models, type InferSchemaType } from "mongoose";

const LeadSchema = new Schema(
  {
    source: { type: String, enum: ["demo", "narxlar_b2b", "narxlar_b2g", "pilot"], required: true },
    organizationName: { type: String, required: true },
    contactName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    message: { type: String },
    plan: { type: String }, // e.g. "boshlangich" | "standart" | "professional" | "b2g"
    status: { type: String, enum: ["yangi", "bogolanildi", "yopildi"], default: "yangi" },
  },
  { timestamps: true }
);

export type Lead = InferSchemaType<typeof LeadSchema> & { _id: string };

export default models.Lead || model("Lead", LeadSchema);
