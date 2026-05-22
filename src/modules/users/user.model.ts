import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["password", "google"], default: "password" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    emailVerified: { type: Boolean, default: false },
    avatarUrl: String,
    quotaBytes: { type: Number, default: 5_000_000_000 },
    usedBytes: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "blocked"], default: "active" }
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
