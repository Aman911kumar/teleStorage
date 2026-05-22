import { Schema, model, type InferSchemaType, Types } from "mongoose";

const mediaVariantSchema = new Schema(
  {
    label: { type: String, required: true },
    mimeType: String,
    width: Number,
    height: Number,
    duration: Number,
    size: Number,
    provider: String,
    providerFileId: String,
    providerMessageId: String
  },
  { _id: false }
);

const mediaSchema = new Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    provider: { type: String, required: true, index: true },
    providerFileId: { type: String, required: true },
    providerMessageId: String,
    workspaceId: { type: Types.ObjectId, ref: "Workspace", index: true },
    folderId: { type: Types.ObjectId, ref: "Folder", index: true },
    telegramFileId: String,
    telegramMessageId: String,
    mediaType: { type: String, enum: ["image", "video", "document", "thumbnail"], index: true },
    uploadedBy: { type: Types.ObjectId, ref: "User", index: true },
    visibility: { type: String, enum: ["public", "private"], default: "private", index: true },
    tags: [{ type: String, index: true }],
    customMetadata: { type: Map, of: String, default: {} },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      pages: Number,
      format: String
    },
    variants: [mediaVariantSchema],
    thumbnail: mediaVariantSchema,
    checksum: { type: String, required: true },
    status: {
      type: String,
      enum: ["uploaded", "processing", "ready", "failed", "deleted"],
      default: "uploaded",
      index: true
    }
  },
  { timestamps: true }
);

mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ workspaceId: 1, checksum: 1 }, { unique: true });

export type MediaDocument = InferSchemaType<typeof mediaSchema> & { _id: Types.ObjectId };
export const MediaModel = model("Media", mediaSchema);
