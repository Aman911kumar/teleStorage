import { Schema, model, type InferSchemaType, Types } from "mongoose";

const apiKeySchema = new Schema(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", required: true, index: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    publicKey: { type: String, required: true, unique: true, index: true },
    secretHash: { type: String, required: true },
    scopes: [{ type: String, enum: ["upload", "read", "write", "delete", "admin", "full"] }],
    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    lastUsedAt: Date,
    lastUsedIp: String
  },
  { timestamps: true }
);

apiKeySchema.index({ workspaceId: 1, status: 1 });

export type ApiKeyDocument = InferSchemaType<typeof apiKeySchema> & { _id: Types.ObjectId };
export const ApiKeyModel = model("ApiKey", apiKeySchema);
