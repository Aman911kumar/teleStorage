import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { AuthService } from "./auth.service.js";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
const service = new AuthService();
export const authRouter = Router();

authRouter.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    res.status(201).json({ success: true, data: await service.register(body.email, body.password) });
  })
);

authRouter.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    res.status(201).json({ success: true, data: await service.register(body.email, body.password) });
  })
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    res.json({ success: true, data: await service.login(body.email, body.password) });
  })
);

authRouter.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const body = schema.parse(req.body);
    res.json({ success: true, data: await service.login(body.email, body.password) });
  })
);
