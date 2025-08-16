import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PaymentIntent } from '../models/paymentIntent';
import { validateOrderItems } from '../utils/orderUtils';
import { razorpay } from '../utils/razorpay';
import { CreateOrderRequest } from '../types/order';



export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { items, address, couponCode, deliveryFee = 0 }: CreateOrderRequest = req.body;
  
 console.log("user", userId)

  if (!items || !items.length) {
    throw new ApiError(400, "No items provided");
  }
  if (!address) {
    throw new ApiError(400, "Address is required");
  }

  const calculateDeliveryFee = (city: string): number => {
    const normalizedCity = city.toLowerCase().trim();
    return normalizedCity === 'aligarh' ? 40 : 80;
  };

   // ✅ Override delivery fee with city-based pricing
  const cityBasedDeliveryFee = calculateDeliveryFee(address.city);

  // Validate all items, stock, and calculate totals
  const { validatedItems, totalAmount, discount, finalAmount, appliedCoupon } = 
    await validateOrderItems(items, couponCode);

  
  // Add delivery fee to final amount
  const totalWithDelivery = finalAmount + cityBasedDeliveryFee;


  console.log("total mnye" ,  totalWithDelivery)

  const shortUserId = userId ? userId.toString().slice(-6) : 'guest';
  const receiptId = `ord_${Date.now()}_${shortUserId}`.slice(0, 40);


  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalWithDelivery * 100), // Convert to paise
    currency: 'INR',
    receipt: receiptId,
    notes: {
      userId: userId?.toString() || 'guest',
      itemCount: items.length.toString(),
      deliveryCity: address.city, // ✅ Add city info to notes
      deliveryFee: cityBasedDeliveryFee.toString(), // ✅ Add delivery fee 
    }
  });

  // Store payment intent for tracking
  await PaymentIntent.create({
    razorpayOrderId: razorpayOrder.id,
    userId,
    items: validatedItems,
    totalAmount,
    discount,
    deliveryFee: cityBasedDeliveryFee,
    finalAmount: totalWithDelivery,
    address,
    couponCode,
    appliedCouponId: appliedCoupon?._id,
    status: 'pending',
  });

  return res.status(200).json(new ApiResponse(200, {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    key: process.env.RAZORPAY_KEY_ID,
    totalAmount,
    discount,
    finalAmount,
    deliveryFee: cityBasedDeliveryFee,
    totalWithDelivery
  }, "Payment order created successfully"));
});
