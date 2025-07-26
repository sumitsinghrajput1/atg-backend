import express from "express";
import {
  
  loginUser,
  updateUserProfile,
  getAllUsers,
  getUserById,
  blockUser,
  sendOtp , 
  verifyOtpAndRegister,
  resendOtp 
} from "../controllers/user";


import { isLoggedIn } from "../middlewares/auth";
import { isAdmin } from "../middlewares/role";


const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-register', verifyOtpAndRegister);
router.post("/resend-otp", resendOtp);


router.post("/login", loginUser);
router.put("/profile", isLoggedIn, updateUserProfile);

// Admin routes (protect with middleware later)
router.get("/",  getAllUsers);
router.get("/:id", getUserById);
router.put("/:id/block", blockUser);

export default router;
