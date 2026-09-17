import { Schema, model, models, type InferSchemaType } from "mongoose";

const HospitalSchema = new Schema(
  {
    name: { type: String, required: true },
    region: { type: String, required: true },
    plan: {
      type: String,
      enum: ["boshlangich", "standart", "professional", "b2g"],
      default: "boshlangich",
    },
  },
  { timestamps: true }
);

export type Hospital = InferSchemaType<typeof HospitalSchema> & { _id: string };

export default models.Hospital || model("Hospital", HospitalSchema);
