import express from "express";
import {
  placeOrder,
  getOrderById,
  getMyOrders,
  requestCancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  verifyAndCreateOrder
  
} from "../controllers/order";
import { isLoggedIn } from "../middlewares/auth";


import { requireAdmin } from "../middlewares/adminAuth";


const router = express.Router();

//  User routes
// router.post("/", isLoggedIn , placeOrder);
router.post('/verify', isLoggedIn, verifyAndCreateOrder);


router.get("/me", isLoggedIn, getMyOrders);
router.get("/:id",requireAdmin,  getOrderById);
router.put("/:id/cancel", isLoggedIn, requestCancelOrder);

//  Admin routes
router.get("/admin/all",requireAdmin,  getAllOrders);
router.put("/admin/:id/status",requireAdmin,   updateOrderStatus);
router.delete("/admin/:id", requireAdmin,  deleteOrder);

export default router;
