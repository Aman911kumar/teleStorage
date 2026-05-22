import type { Response } from "express";
import crypto from "node:crypto";
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

type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleUserResponse = { id?: string; email?: string; name?: string; picture?: string; verified_email?: boolean };

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

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/google",
    maxAge: 10 * 60 * 1000
  };
}

function meta(req: AuthenticatedRequest) {
  return { userAgent: req.header("user-agent"), ip: req.ip };
}

function sendSession(res: Response, session: Awaited<ReturnType<AuthService["login"]>>) {
  setRefreshCookie(res, session.refreshToken);
  res.json({ success: true, data: { token: session.accessToken, accessToken: session.accessToken, user: session.user } });
}

function googleCallbackUrl() {
  return env.GOOGLE_CALLBACK_URL ?? `${env.APP_BASE_URL}/api/auth/google/callback`;
}

async function readJson<T>(response: globalThis.Response, fallback: string) {
  const text = await response.text();
  if (!text) throw new Error(fallback);
  return JSON.parse(text) as T;
}

async function exchangeGoogleCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleCallbackUrl(),
      grant_type: "authorization_code"
    })
  });
  const data = await readJson<GoogleTokenResponse>(response, "Google returned an empty token response.");
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Google token exchange failed.");
  }
  return data.access_token;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await readJson<GoogleUserResponse>(response, "Google returned an empty profile response.");
  if (!response.ok || !data.id || !data.email) throw new Error("Google profile is missing required account details.");
  return data;
}

authRouter.get(
  "/api/auth/google",
  authLimiter,
  asyncHandler(async (_req, res) => {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.status(501).json({ success: false, error: { code: "GOOGLE_AUTH_NOT_CONFIGURED", message: "Google login is not configured." } });
      return;
    }
    const state = crypto.randomBytes(24).toString("base64url");
    res.cookie("telestore_google_state", state, oauthStateCookieOptions());
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", googleCallbackUrl());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    res.redirect(url.toString());
  })
);

authRouter.get(
  "/api/auth/google/callback",
  authLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = readCookie(req, "telestore_google_state");
    res.clearCookie("telestore_google_state", { ...oauthStateCookieOptions(), maxAge: undefined });
    if (!code || !state || !cookieState || state !== cookieState) {
      res.redirect(`${env.FRONTEND_APP_URL}/login?error=google_state`);
      return;
    }

    try {
      const accessToken = await exchangeGoogleCode(code);
      const profile = await fetchGoogleProfile(accessToken);
      const session = await service.loginWithGoogle(
        { id: profile.id!, email: profile.email!, name: profile.name, picture: profile.picture, verifiedEmail: profile.verified_email },
        meta(req)
      );
      setRefreshCookie(res, session.refreshToken);
      res.redirect(`${env.FRONTEND_APP_URL}/auth/callback`);
    } catch {
      res.redirect(`${env.FRONTEND_APP_URL}/login?error=google_failed`);
    }
  })
);

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
