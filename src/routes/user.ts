import express from "express";
import {
  
  loginUser,
  updateUserProfile,
  getAllUsers,
  getUserById,
  blockUser,
  sendOtp , 
  verifyOtpAndRegister,
  resendOtp, 
  getCurrentUser
} from "../controllers/user";


import { isLoggedIn } from "../middlewares/auth";
import { isAdmin } from "../middlewares/role";


const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-register', verifyOtpAndRegister);
router.post("/resend-otp", resendOtp);


router.post("/login", loginUser);

router.get("/me", isLoggedIn, getCurrentUser); 

router.put("/profile", isLoggedIn, updateUserProfile);

  
// Admin routes (protect with middleware later)
router.get("/", isAdmin,  getAllUsers);
router.get("/:id",isAdmin, getUserById);
router.put("/:id/block",isAdmin,  blockUser);

export default router;
