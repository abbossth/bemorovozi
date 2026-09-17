import { Schema, model, models, type InferSchemaType } from "mongoose";

const StaffSchema = new Schema(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
  },
  { timestamps: true }
);

export type Staff = InferSchemaType<typeof StaffSchema> & { _id: string };

export default models.Staff || model("Staff", StaffSchema);
