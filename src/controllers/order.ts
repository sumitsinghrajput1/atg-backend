import { Request, Response } from "express";
import crypto from 'crypto';
import { Order } from "../models/Order";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Product } from "../models/Product";
import { Coupon } from "../models/Coupon";
import { razorpay } from '../utils/razorpay';
import { VerifyOrderRequest } from '../types/order';
import { validateOrderItems, getNextOrderId, findVariant } from '../utils/orderUtils';



export const verifyAndCreateOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    items, 
    address, 
    couponCode,
    deliveryFee = 0
  }: VerifyOrderRequest = req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment verification data");
  }
  if (!items || !items.length) throw new ApiError(400, "No items provided");
  if (!address) throw new ApiError(400, "Address is required");

  // 1. Verify Razorpay signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature - possible fraud attempt");
  }

  // 2. Fetch and verify payment from Razorpay
  let payment;
  try {
    payment = await razorpay.payments.fetch(razorpay_payment_id);
  } catch (error) {
    throw new ApiError(400, "Failed to verify payment with Razorpay");
  }

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    throw new ApiError(400, `Payment not successful. Status: ${payment.status}`);
  }

  if (payment.order_id !== razorpay_order_id) {
    throw new ApiError(400, "Payment order ID mismatch");
  }

  // 3. RE-VALIDATE everything (stock, price, coupon)
  let validationResult;
  try {
    validationResult = await validateOrderItems(items, couponCode);
  } catch (error: any) {
    // If validation fails, initiate refund
    try {
      await razorpay.payments.refund(razorpay_payment_id, {
        amount: payment.amount,
        speed: 'optimum',
        notes: {
          reason: 'Order validation failed',
          error: error.message
        }
      });
    } catch (refundError) {
      console.error('Refund failed:', refundError);
    }
    
    throw new ApiError(400, `Order validation failed: ${error.message}. Refund initiated.`);
  }

  const { validatedItems, totalAmount, discount, finalAmount, appliedCoupon } = validationResult;
  const totalWithDelivery = finalAmount + deliveryFee;

  // 4. Verify paid amount matches calculated amount
  const expectedAmountInPaise = Math.round(totalWithDelivery * 100);
  if (payment.amount !== expectedAmountInPaise) {
    // Initiate refund for amount mismatch
    try {
      await razorpay.payments.refund(razorpay_payment_id, {
        amount: payment.amount,
        speed: 'optimum',
        notes: {
          reason: 'Amount mismatch',
          expected: expectedAmountInPaise,
          paid: payment.amount
        }
      });
    } catch (refundError) {
      console.error('Refund failed:', refundError);
    }
    
    throw new ApiError(400, `Amount mismatch detected. Expected: ₹${totalWithDelivery}, Paid: ₹${(payment.amount as number)/100}. Refund initiated.`);
  }

  // 5. Create the order
  const orderId = await getNextOrderId();
  const order = await Order.create({
    orderId,
    userId,
    items: validatedItems,
    totalAmount,
    discount,
    deliveryFee,
    finalAmount: totalWithDelivery,
    address,
    couponCode,
    paymentStatus: "success",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    status: "processing",
  });

  if (!order) {
    throw new ApiError(500, "Failed to create order");
  }

  // 6. Decrease stock (same logic as your original)
  try {
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (product) {
        const qty = Number(item.quantity);
        
        if (!isNaN(qty)) {
          if (item.variant) {
            const selectedVariant = findVariant(product, item.variant);
            if (selectedVariant) {
              selectedVariant.stock -= qty;
              await product.save();
            }
          } else {
            product.stock -= qty;
            await product.save();
          }
        }

        // Handle bundle items stock deduction
        if (product.isBundle && product.bundleItems?.length) {
          for (const bundleItem of product.bundleItems) {
            const subProduct = await Product.findById(bundleItem.productId);
            const subQty = Number(bundleItem.quantity) * qty;

            if (subProduct && !isNaN(subQty)) {
              const bundleItemData = item.bundleItems?.find(
                (bi: any) => bi.productId.toString() === bundleItem.productId.toString()
              );

              if (bundleItemData?.variant) {
                const selectedVariant = findVariant(subProduct, bundleItemData.variant);
                if (selectedVariant) {
                  selectedVariant.stock -= subQty;
                  await subProduct.save();
                }
              } else {
                subProduct.stock -= subQty;
                await subProduct.save();
              }
            }
          }
        }
      }
    }

    // Update coupon used count
    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }

  } catch (stockError) {
    console.error("Stock deduction failed:", stockError);
  }

  return res.status(201).json(new ApiResponse(201, { 
    order,
    paymentId: razorpay_payment_id,
    message: "Order placed successfully"
  }, "Order placed successfully"));
});




// 1. Place Order // will use cache for products and coupouns
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { items, address, couponCode, paymentStatus, paymentId } = req.body;
  
  if (!items || !items.length) throw new ApiError(400, "No items provided");

  let totalAmount = 0;
  const validatedItems = [];

  // Helper function to find variant in product
  const findVariant = (product: any, variantInfo: { color?: string; size?: string }) => {
    if (!product.variants || !product.variants.length || !variantInfo) {
      return null;
    }
    
    return product.variants.find((variant: any) => {
      const colorMatch = !variantInfo.color || variant.color === variantInfo.color;
      const sizeMatch = !variantInfo.size || variant.size === variantInfo.size;
      return colorMatch && sizeMatch;
    });
  };

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for product ${item.productId}`);
    }

    const product = await Product.findById(item.productId);

    if (!product || !product.isAvailable || product.price == null || product.price <= 0) {
      throw new ApiError(400, `Product unavailable: ${item.productId}`);
    }

    // ✅ Check variant stock if variant is provided
    if (item.variant) {
      const selectedVariant = findVariant(product, item.variant);
      
      if (!selectedVariant) {
        throw new ApiError(400, `Variant not found for product: ${product.name}`);
      }
      
      if (selectedVariant.stock == null || selectedVariant.stock <= 0) {
        throw new ApiError(400, `Variant out of stock for ${product.name}`);
      }
      
      if (selectedVariant.stock < qty) {
        throw new ApiError(400, `Insufficient variant stock for ${product.name}`);
      }
    } else {
      // ✅ Check main product stock if no variant
      if (product.stock == null || product.stock <= 0) {
        throw new ApiError(400, `Out of stock: ${product.name}`);
      }
      
      if (product.stock < qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
    }

    // ✅ If it's a bundle, validate stock of bundled items too
    if (product.isBundle && product.bundleItems?.length) {
      for (const bundleItem of product.bundleItems) {
        const subProduct = await Product.findById(bundleItem.productId);
        const requiredQty = bundleItem.quantity * qty;

        if (!subProduct) {
          throw new ApiError(400, `Bundle item not found`);
        }

        // Check bundle item variant stock if specified
        if (item.bundleItems) {
          const bundleItemData = item.bundleItems.find(
            (bi: any) => bi.productId.toString() === bundleItem.productId.toString()
          );
          
          if (bundleItemData?.variant) {
            const selectedVariant = findVariant(subProduct, bundleItemData.variant);
            
            if (!selectedVariant) {
              throw new ApiError(400, `Bundle item variant not found: ${subProduct.name}`);
            }
            
            if (selectedVariant.stock < requiredQty) {
              throw new ApiError(400, `Insufficient variant stock for bundle item: ${subProduct.name}`);
            }
          } else {
            // Check main stock for bundle item
            if (subProduct.stock == null || subProduct.stock < requiredQty) {
              throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name}`);
            }
          }
        } else {
          // Default: check main stock
          if (subProduct.stock == null || subProduct.stock < requiredQty) {
            throw new ApiError(400, `Insufficient stock for bundle item: ${subProduct.name}`);
          }
        }
      }
    }

    const itemTotal = product.price * qty;
    totalAmount += itemTotal;

    validatedItems.push({
      productId: product._id,
      quantity: qty,
      price: product.price,
      variant: item.variant || undefined,
      isBundle: product.isBundle,
      bundleItems: product.isBundle ? (item.bundleItems || product.bundleItems) : undefined,
    });
  }

  // 🧾 Coupon logic (unchanged)
  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    const now = new Date();

    if (
      !coupon ||
      coupon.validTill < now ||
      (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) ||
      totalAmount < coupon.minPurchase
    ) {
      throw new ApiError(400, "Invalid, expired, or inapplicable coupon");
    }

    if (coupon.discountPercent) {
      discount = (totalAmount * coupon.discountPercent) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountValue) {
      discount = coupon.discountValue;
    }

    appliedCoupon = coupon;
  }

  const finalAmount = Math.max(totalAmount - discount, 0);
  const orderId = await getNextOrderId();

  // ✅ Create order
  const order = await Order.create({
    orderId,
    userId,
    items: validatedItems,
    totalAmount,
    discount,
    finalAmount,
    address,
    couponCode,
    paymentStatus,
    paymentId,
    status: "processing",
  });

  if (order) {
    // ⬇️ Decrease stock of each product (and bundle items)
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (product) {
        const qty = Number(item.quantity);
        
        if (!isNaN(qty)) {
          // ✅ Deduct from variant stock if variant is specified
          if (item.variant) {
            const selectedVariant = findVariant(product, item.variant);
            if (selectedVariant) {
              selectedVariant.stock -= qty;
              await product.save(); // This saves the entire product including variants
            }
          } else {
            // ✅ Deduct from main product stock
            product.stock -= qty;
            await product.save();
          }
        }

        // ✅ Handle bundle items stock deduction
        if (product.isBundle && product.bundleItems?.length) {
          for (const bundleItem of product.bundleItems) {
            const subProduct = await Product.findById(bundleItem.productId);
            const subQty = Number(bundleItem.quantity) * qty;

            if (subProduct && !isNaN(subQty)) {
              // Check if bundle item has variant specified
              const bundleItemData = item.bundleItems?.find(
                (bi: any) => bi.productId.toString() === bundleItem.productId.toString()
              );

              if (bundleItemData?.variant) {
                const selectedVariant = findVariant(subProduct, bundleItemData.variant);
                if (selectedVariant) {
                  selectedVariant.stock -= subQty;
                  await subProduct.save();
                }
              } else {
                subProduct.stock -= subQty;
                await subProduct.save();
              }
            }
          }
        }
      }
    }

    // ⬆️ Update coupon used count
    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }
  }

  return res
    .status(201)
    .json(new ApiResponse(201, { order }, "Order placed successfully"));
});



// 2. Get Order by ID
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const order = await Order.findOne({ _id: req.params.id, userId }).populate("items.productId items.bundleItems.productId");
  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json(new ApiResponse(200, { order }));
});

// 3. Get All Orders by Logged-in User
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const orders = await Order.find({ userId });
  return res.status(200).json(new ApiResponse(200, { orders }));
});

// 4. User Cancel Request (soft cancel only)
export const requestCancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const order = await Order.findOne({ _id: req.params.id, userId });

  if (!order) throw new ApiError(404, "Order not found");
  if (order.status === "cancelled") throw new ApiError(400, "Order already cancelled");

  order.status = "cancelled";
  await order.save();

  return res.status(200).json(new ApiResponse(200, { order }, "Order cancelled"));
});

// 5. Admin: Get All Orders
export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    paymentStatus = '',
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const searchQuery: any = {};

  // 🔍 Search fields
  if (search) {
    searchQuery.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { 'address.name': { $regex: search, $options: 'i' } },
      { 'address.phone': { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
      { 'address.state': { $regex: search, $options: 'i' } }
    ];
  }

  if (status && status !== 'all') {
    searchQuery.status = status;
  }

  if (paymentStatus && paymentStatus !== 'all') {
    searchQuery.paymentStatus = paymentStatus;
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const sortObject: any = {};
  sortObject[sortBy as string] = order === 'desc' ? -1 : 1;

  const [orders, totalCount] = await Promise.all([
    Order.find(searchQuery)
      .populate("userId")
      .populate("items.productId items.bundleItems.productId")
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(searchQuery)
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    })
  );
});


// 6. Admin: Change Order Status
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const allowedStatuses = ["processing", "shipped", "delivered", "cancelled"];

  if (!allowedStatuses.includes(status)) throw new ApiError(400, "Invalid status");

  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) throw new ApiError(404, "Order not found");

  return res.status(200).json(new ApiResponse(200, { order }, "Order status updated"));
});

// 7. Admin: Delete/Remove Order
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Order.findByIdAndDelete(req.params.id);
  if (!deleted) throw new ApiError(404, "Order not found");

  return res.status(200).json(new ApiResponse(200, {}, "Order deleted"));
});
