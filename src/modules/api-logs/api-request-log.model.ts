import { Schema, model, type InferSchemaType, Types } from "mongoose";

const apiRequestLogSchema = new Schema(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", index: true },
    owner: { type: Types.ObjectId, ref: "User", index: true },
    method: String,
    path: String,
    statusCode: Number,
    durationMs: Number,
    bytes: Number,
    userAgent: String,
    ip: String
  },
  { timestamps: true }
);

apiRequestLogSchema.index({ createdAt: -1 });

export type ApiRequestLogDocument = InferSchemaType<typeof apiRequestLogSchema>;
export const ApiRequestLogModel = model("ApiRequestLog", apiRequestLogSchema);
