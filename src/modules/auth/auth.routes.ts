import type { Response } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { AuthenticatedRequest } from "../../core/types.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AuthService } from "./auth.service.js";

const service = new AuthService();
export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8), remember: z.boolean().optional() });
const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(16), password: z.string().min(8) });
const verifySchema = z.object({ token: z.string().min(16) });
const profileSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().email().optional() });
const passwordSchema = z.object({ currentPassword: z.string().min(8), nextPassword: z.string().min(8) });

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000
  };
}

function readCookie(req: AuthenticatedRequest, name: string) {
  const cookies = req.headers.cookie?.split(";").map((item) => item.trim()) ?? [];
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie("telestore_refresh", refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res: Response) {
  res.clearCookie("telestore_refresh", { ...refreshCookieOptions(), maxAge: undefined });
}

function meta(req: AuthenticatedRequest) {
  return { userAgent: req.header("user-agent"), ip: req.ip };
}

function sendSession(res: Response, session: Awaited<ReturnType<AuthService["login"]>>) {
  setRefreshCookie(res, session.refreshToken);
  res.json({ success: true, data: { token: session.accessToken, accessToken: session.accessToken, user: session.user } });
}

authRouter.post(
  ["/auth/register", "/api/auth/register"],
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = registerSchema.parse(req.body);
    const session = await service.register(body, meta(req));
    setRefreshCookie(res, session.refreshToken);
    res.status(201).json({
      success: true,
      data: {
        token: session.accessToken,
        accessToken: session.accessToken,
        user: session.user,
        verificationToken: env.NODE_ENV === "production" ? undefined : session.verificationToken
      }
    });
  })
);

authRouter.post(
  ["/auth/login", "/api/auth/login"],
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = loginSchema.parse(req.body);
    sendSession(res, await service.login(body.email, body.password, meta(req)));
  })
);

authRouter.post(
  "/api/auth/refresh",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const refreshToken = readCookie(req, "telestore_refresh") ?? req.body?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: { code: "SESSION_EXPIRED", message: "Your session expired. Please sign in again." } });
      return;
    }
    const session = await service.refresh(refreshToken, meta(req));
    setRefreshCookie(res, session.refreshToken);
    res.json({ success: true, data: { token: session.accessToken, accessToken: session.accessToken, user: session.user } });
  })
);

authRouter.post(
  "/api/auth/logout",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await service.logout(readCookie(req, "telestore_refresh"));
    clearRefreshCookie(res);
    res.status(204).send();
  })
);

authRouter.get(
  "/api/auth/me",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.me(req.user!.id) });
  })
);

authRouter.patch(
  "/api/auth/profile",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.updateProfile(req.user!.id, profileSchema.parse(req.body)) });
  })
);

authRouter.post(
  "/api/auth/change-password",
  requireAuth,
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = passwordSchema.parse(req.body);
    await service.changePassword(req.user!.id, body.currentPassword, body.nextPassword);
    clearRefreshCookie(res);
    res.status(204).send();
  })
);

authRouter.post(
  "/api/auth/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = await service.requestPasswordReset(emailSchema.parse(req.body).email);
    res.json({ success: true, data: { message: "If an account exists, reset instructions were created.", ...data } });
  })
);

authRouter.post(
  "/api/auth/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = resetSchema.parse(req.body);
    await service.resetPassword(body.token, body.password);
    res.status(204).send();
  })
);

authRouter.post(
  "/api/auth/verify-email",
  asyncHandler(async (req, res) => {
    await service.verifyEmail(verifySchema.parse(req.body).token);
    res.status(204).send();
  })
);

authRouter.post(
  "/api/auth/resend-verification",
  requireAuth,
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const data = await service.resendVerification(req.user!.id);
    res.json({ success: true, data: env.NODE_ENV === "production" ? {} : data });
  })
);

authRouter.get(
  "/api/auth/sessions",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({ success: true, data: await service.listSessions(req.user!.id) });
  })
);

authRouter.delete(
  "/api/auth/sessions/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await service.revokeSession(req.user!.id, req.params.id);
    res.status(204).send();
  })
);
