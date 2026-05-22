import { Schema, model, type InferSchemaType, Types } from "mongoose";

const authTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    type: { type: String, enum: ["email_verification", "password_reset"], required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: Date
  },
  { timestamps: true }
);

authTokenSchema.index({ userId: 1, type: 1, usedAt: 1 });

export type AuthTokenDocument = InferSchemaType<typeof authTokenSchema>;
export const AuthTokenModel = model("AuthToken", authTokenSchema);
