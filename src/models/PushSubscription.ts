import { Schema, model, models, type InferSchemaType } from "mongoose";

// One row per browser/device a staff member turned admin-panel notifications on for.
// A staff member can have several (laptop + phone); the same browser has exactly one
// endpoint, so re-subscribing after a different staff logs in there simply re-assigns it.
const PushSubscriptionSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: "Hospital", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export type PushSubscriptionDoc = InferSchemaType<typeof PushSubscriptionSchema> & { _id: string };

export default models.PushSubscription || model("PushSubscription", PushSubscriptionSchema);
