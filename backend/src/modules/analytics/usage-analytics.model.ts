import { Schema, model, type InferSchemaType, Types } from "mongoose";

const usageAnalyticsSchema = new Schema(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", index: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    uploads: { type: Number, default: 0 },
    bytesStored: { type: Number, default: 0 },
    bandwidthBytes: { type: Number, default: 0 },
    apiRequests: { type: Number, default: 0 }
  },
  { timestamps: true }
);

usageAnalyticsSchema.index({ owner: 1, workspaceId: 1, date: 1 }, { unique: true });

export type UsageAnalyticsDocument = InferSchemaType<typeof usageAnalyticsSchema>;
export const UsageAnalyticsModel = model("UsageAnalytics", usageAnalyticsSchema);
