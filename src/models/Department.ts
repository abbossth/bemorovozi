import { Schema, model, models, type InferSchemaType } from "mongoose";

const DepartmentSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    name: { type: String, required: true },
    qrSlug: { type: String, required: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ hospitalId: 1, qrSlug: 1 }, { unique: true });

export type Department = InferSchemaType<typeof DepartmentSchema> & { _id: string };

export default models.Department || model("Department", DepartmentSchema);
