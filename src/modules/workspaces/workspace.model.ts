import { Schema, model, type InferSchemaType, Types } from "mongoose";
import { generatePublicProjectId, generateUploadToken, hashUploadToken } from "../../utils/apiTokens.js";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    publicProjectId: { type: String, required: true, unique: true, default: generatePublicProjectId, index: true },
    uploadTokenHash: { type: String, required: true, default: () => hashUploadToken(generateUploadToken()) },
    telegramBotTokenEncrypted: { type: String, required: true },
    telegramChannelId: { type: String, required: true },
    telegramBotUsername: { type: String, required: true },
    telegramChannelTitle: String,
    storageUsed: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 },
    uploadCount: { type: Number, default: 0 },
    imageCount: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },
    compressionSavings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    health: {
      status: { type: String, enum: ["healthy", "warning", "failed"], default: "healthy" },
      checkedAt: Date,
      message: String
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

workspaceSchema.index({ createdBy: 1, slug: 1 }, { unique: true });

export type WorkspaceDocument = InferSchemaType<typeof workspaceSchema> & { _id: Types.ObjectId };
export const WorkspaceModel = model("Workspace", workspaceSchema);
