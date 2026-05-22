import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError, NotFoundError } from "../../core/errors.js";
import type { Role } from "../../core/types.js";
import { UserModel } from "../users/user.model.js";
import { AuthTokenModel } from "./auth-token.model.js";
import { SessionModel } from "./session.model.js";

const refreshTokenDays = 30;
const accessTokenMinutes = 15;

type RequestMeta = { userAgent?: string; ip?: string };
type GoogleProfile = { id: string; email: string; name?: string; picture?: string; verifiedEmail?: boolean };

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function sanitizeUser(user: any) {
  return {
    id: user._id?.toString() ?? user.id,
    name: user.name || user.email.split("@")[0],
    email: user.email,
    role: user.role as Role,
    emailVerified: Boolean(user.emailVerified),
    avatarUrl: user.avatarUrl
  };
}

function assertStrongPassword(password: string) {
  const strong = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
  if (!strong) {
    throw new AppError("Use at least 8 characters with uppercase, lowercase, and a number.", 400, "WEAK_PASSWORD");
  }
}

export class AuthService {
  async register(input: { name?: string; email: string; password: string }, meta: RequestMeta) {
    assertStrongPassword(input.password);
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() }).lean();
    if (existing) throw new AppError("An account with this email already exists.", 409, "EMAIL_ALREADY_EXISTS");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await UserModel.create({
      name: input.name?.trim() || input.email.split("@")[0],
      email: input.email,
      passwordHash,
      role: "user",
      quotaBytes: 5_000_000_000
    });
    const verification = await this.createOneTimeToken(user.id, "email_verification", 24 * 60);
    return { ...(await this.createSession(user, meta)), verificationToken: verification.token };
  }

  async login(email: string, password: string, meta: RequestMeta) {
    const user = await UserModel.findOne({ email: email.toLowerCase(), status: "active" });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError("Incorrect email or password.", 401, "INVALID_CREDENTIALS");
    }
    return this.createSession(user, meta);
  }

  async loginWithGoogle(profile: GoogleProfile, meta: RequestMeta) {
    const email = profile.email.toLowerCase();
    let user = await UserModel.findOne({ $or: [{ googleId: profile.id }, { email }] });
    if (!user) {
      user = await UserModel.create({
        name: profile.name || email.split("@")[0],
        email,
        passwordHash: await bcrypt.hash(randomToken(), 12),
        googleId: profile.id,
        authProvider: "google",
        emailVerified: profile.verifiedEmail ?? true,
        avatarUrl: profile.picture,
        role: "user",
        quotaBytes: 5_000_000_000
      });
    } else {
      user.googleId = user.googleId || profile.id;
      user.authProvider = "google";
      user.emailVerified = user.emailVerified || Boolean(profile.verifiedEmail);
      user.name = user.name || profile.name || email.split("@")[0];
      user.avatarUrl = user.avatarUrl || profile.picture;
      await user.save();
    }

    if (user.status !== "active") throw new AppError("Account is unavailable.", 403, "ACCOUNT_UNAVAILABLE");
    return this.createSession(user, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const session = await SessionModel.findOne({ refreshTokenHash: sha256(refreshToken), revokedAt: { $exists: false } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new AppError("Your session expired. Please sign in again.", 401, "SESSION_EXPIRED");
    }
    const user = await UserModel.findById(session.userId);
    if (!user || user.status !== "active") throw new AppError("Account is unavailable.", 403, "ACCOUNT_UNAVAILABLE");

    const nextRefreshToken = randomToken();
    session.refreshTokenHash = sha256(nextRefreshToken);
    session.lastUsedAt = new Date();
    session.userAgent = meta.userAgent ?? session.userAgent;
    session.ip = meta.ip ?? session.ip;
    await session.save();

    return {
      accessToken: this.issueAccessToken(user.id, user.role, session.id),
      refreshToken: nextRefreshToken,
      user: sanitizeUser(user)
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await SessionModel.updateOne({ refreshTokenHash: sha256(refreshToken) }, { revokedAt: new Date() });
  }

  async me(userId: string) {
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new NotFoundError("User not found");
    return sanitizeUser(user);
  }

  async updateProfile(userId: string, input: { name?: string; email?: string }) {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name.trim();
    if (input.email !== undefined) {
      const email = input.email.toLowerCase().trim();
      const duplicate = await UserModel.findOne({ email, _id: { $ne: userId } }).lean();
      if (duplicate) throw new AppError("This email is already in use.", 409, "EMAIL_ALREADY_EXISTS");
      update.email = email;
      update.emailVerified = false;
    }
    const user = await UserModel.findByIdAndUpdate(userId, update, { new: true }).lean();
    if (!user) throw new NotFoundError("User not found");
    return sanitizeUser(user);
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    assertStrongPassword(nextPassword);
    const user = await UserModel.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AppError("Current password is incorrect.", 400, "INVALID_CURRENT_PASSWORD");
    }
    user.passwordHash = await bcrypt.hash(nextPassword, 12);
    await user.save();
    await SessionModel.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  }

  async requestPasswordReset(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return { resetToken: undefined };
    const token = await this.createOneTimeToken(user.id, "password_reset", 30);
    return { resetToken: token.token };
  }

  async resetPassword(token: string, password: string) {
    assertStrongPassword(password);
    const record = await AuthTokenModel.findOne({
      tokenHash: sha256(token),
      type: "password_reset",
      usedAt: { $exists: false }
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError("Password reset link is invalid or expired.", 400, "RESET_TOKEN_INVALID");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await UserModel.updateOne({ _id: record.userId }, { passwordHash });
    await SessionModel.updateMany({ userId: record.userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    record.usedAt = new Date();
    await record.save();
  }

  async verifyEmail(token: string) {
    const record = await AuthTokenModel.findOne({
      tokenHash: sha256(token),
      type: "email_verification",
      usedAt: { $exists: false }
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new AppError("Email verification link is invalid or expired.", 400, "VERIFY_TOKEN_INVALID");
    }
    await UserModel.updateOne({ _id: record.userId }, { emailVerified: true });
    record.usedAt = new Date();
    await record.save();
  }

  async resendVerification(userId: string) {
    const token = await this.createOneTimeToken(userId, "email_verification", 24 * 60);
    return { verificationToken: token.token };
  }

  async listSessions(userId: string) {
    const sessions = await SessionModel.find({ userId }).sort({ lastUsedAt: -1 }).lean();
    return sessions.map((session) => ({
      id: session._id.toString(),
      userAgent: session.userAgent ?? "Unknown browser",
      ip: session.ip ?? "Unknown IP",
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revoked: Boolean(session.revokedAt)
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await SessionModel.updateOne({ _id: sessionId, userId }, { revokedAt: new Date() });
  }

  private async createSession(user: any, meta: RequestMeta) {
    const refreshToken = randomToken();
    const session = await SessionModel.create({
      userId: user._id,
      refreshTokenHash: sha256(refreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: addDays(refreshTokenDays)
    });
    return {
      token: this.issueAccessToken(user.id, user.role, session.id),
      accessToken: this.issueAccessToken(user.id, user.role, session.id),
      refreshToken,
      user: sanitizeUser(user)
    };
  }

  private async createOneTimeToken(userId: string, type: "email_verification" | "password_reset", minutes: number) {
    await AuthTokenModel.updateMany({ userId, type, usedAt: { $exists: false } }, { usedAt: new Date() });
    const token = randomToken();
    await AuthTokenModel.create({ userId, type, tokenHash: sha256(token), expiresAt: addMinutes(minutes) });
    return { token };
  }

  private issueAccessToken(id: string, role: string, sessionId: string) {
    return jwt.sign({ id, role, sessionId }, env.JWT_SECRET, { expiresIn: `${accessTokenMinutes}m` });
  }
}
