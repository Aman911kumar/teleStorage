import { Schema, model, type InferSchemaType, Types } from "mongoose";

const folderSchema = new Schema(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", required: true, index: true },
    parentId: { type: Types.ObjectId, ref: "Folder" },
    name: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    metadata: { type: Map, of: String, default: {} },
    createdBy: { type: Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

folderSchema.index({ workspaceId: 1, path: 1 }, { unique: true });

export type FolderDocument = InferSchemaType<typeof folderSchema> & { _id: Types.ObjectId };
export const FolderModel = model("Folder", folderSchema);
