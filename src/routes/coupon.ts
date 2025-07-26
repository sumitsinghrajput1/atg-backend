// routes/coupon.ts
import express from "express";
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCoupons,
  getCouponById
} from "../controllers/coupon";
import { requireAdmin } from "../middlewares/adminAuth";

const router = express.Router();

// Protected admin routes
router.post("/", requireAdmin, createCoupon);
router.put("/:id", requireAdmin, updateCoupon);
router.delete("/:id", requireAdmin, deleteCoupon);
router.get("/", requireAdmin, getAllCoupons);
router.get("/:id", requireAdmin, getCouponById);

export default router;
