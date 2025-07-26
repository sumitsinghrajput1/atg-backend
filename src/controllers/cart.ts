import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Cart } from "../models/Cart";


export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity, isBundle = false, bundleItems = [] } = req.body;

  const userId = req.user?._id; // From middleware
  const sessionId = req.cookies.sessionId; // Optional fallback for guests

  if (!userId && !sessionId) {
    throw new ApiError(401, "Unauthorized: No user or session");
  }

  let cart = await Cart.findOne(userId ? { userId } : { sessionId });

  if (!cart) {
    cart = new Cart({ userId, sessionId, items: [] });
  }

  const existingItem = cart.items.find(item =>
    item.productId.toString() === productId &&
    item.isBundle === isBundle
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity, isBundle, bundleItems });
  }

  await cart.save();
  return res.status(200).json(new ApiResponse(200, { cart }, "Item added to cart"));
});



export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body;
  const userId = req.user?._id;
  const sessionId = req.cookies.sessionId;

  if (!userId && !sessionId) {
    throw new ApiError(401, "Unauthorized: No user or session");
  }

  const cart = await Cart.findOne(userId ? { userId } : { sessionId });
  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  cart.items = cart.items.filter(item => item.productId.toString() !== productId);
  await cart.save();

  return res.status(200).json(new ApiResponse(200, { cart }, "Item removed from cart"));
});

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const sessionId = req.cookies.sessionId;

  if (!userId && !sessionId) {
    throw new ApiError(401, "Unauthorized: No user or session");
  }

  const cart = await Cart.findOne(userId ? { userId } : { sessionId }).populate("items.productId");
  return res.status(200).json(new ApiResponse(200, { cart: cart || { items: [] } }, "Cart fetched"));
});

