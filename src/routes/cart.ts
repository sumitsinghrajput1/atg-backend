import express from "express";
import { addToCart, removeFromCart, getCart } from "../controllers/cart";

const router = express.Router();


// Public cart APIs: allow both logged-in and guest users
router.post("/", addToCart);
router.delete("/", removeFromCart);
router.get("/", getCart);

// If you want "logged-in only" variants, use this:
// router.post("/auth", isLoggedIn, addToCart);
// router.get("/auth", isLoggedIn, getCart);


export default router;
