// routes/admin.ts
import express from "express";
import {
  loginWithEmail,
  verifyOtp,
  refreshToken,
  resendOtp,
  logout,
  getAdminProfile
} from "../controllers/admin";
import { requireAdmin } from "../middlewares/adminAuth";

const router = express.Router();

// Public routes (no auth required)
router.post("/login", loginWithEmail);
router.post("/verify-otp", verifyOtp);
router.post("/refresh", refreshToken);
router.post("/resend-otp", resendOtp);
router.post("/logout", logout);

// Protected routes (auth required)
router.get("/profile", requireAdmin, getAdminProfile);

export default router;
