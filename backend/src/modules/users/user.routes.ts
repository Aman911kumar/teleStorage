import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UserModel } from "./user.model.js";

export const userRouter = Router();

userRouter.patch(
  "/admin/users/:id/quota",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const user = await UserModel.findByIdAndUpdate(req.params.id, { quotaBytes: req.body.quotaBytes }, { new: true }).select(
      "-passwordHash"
    );
    res.json({ success: true, data: user });
  })
);
