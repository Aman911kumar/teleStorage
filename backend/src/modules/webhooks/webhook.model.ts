import { Schema, model, type InferSchemaType, Types } from "mongoose";

const webhookSchema = new Schema(
  {
    workspaceId: { type: Types.ObjectId, ref: "Workspace", required: true, index: true },
    owner: { type: Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    events: [{ type: String }],
    status: { type: String, enum: ["active", "disabled"], default: "active" }
  },
  { timestamps: true }
);

export type WebhookDocument = InferSchemaType<typeof webhookSchema>;
export const WebhookModel = model("Webhook", webhookSchema);
