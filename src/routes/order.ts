import express from "express";
import {
  placeOrder,
  getOrderById,
  getMyOrders,
  requestCancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder
} from "../controllers/order";
import { isLoggedIn } from "../middlewares/auth";


import { requireAdmin } from "../middlewares/adminAuth";


const router = express.Router();

//  User routes
router.post("/", isLoggedIn , placeOrder);
router.get("/me", isLoggedIn, getMyOrders);
router.get("/:id",requireAdmin,  getOrderById);
router.put("/:id/cancel", isLoggedIn, requestCancelOrder);

//  Admin routes
router.get("/admin/all",requireAdmin,  getAllOrders);
router.put("/admin/:id/status",requireAdmin,   updateOrderStatus);
router.delete("/admin/:id", requireAdmin,  deleteOrder);

export default router;
