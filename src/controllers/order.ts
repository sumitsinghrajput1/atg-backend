import { Request, Response } from "express";
import { Order } from "../models/Order";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Product } from "../models/Product";
import { Coupon } from "../models/Coupon";
import { getNextOrderId } from "../utils/getNextOrderId";



// 1. Place Order // will use cache for products and coupouns
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { items, address, couponCode, paymentStatus, paymentId } = req.body;
  

  if (!items || !items.length) throw new ApiError(400, "No items provided");




  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new ApiError(400, `Invalid quantity for product ${item.productId}`);
    }

    const product = await Product.findById(item.productId);


    if (
      !product ||
      !product.isAvailable ||
      product.stock == null ||
      product.stock <= 0 ||
      product.price == null ||
      product.price <= 0
    ) {
      throw new ApiError(400, `Out of stock or unavailable: ${item.productId}`);
    }


    console.log("stock", product.stock, item.quantity)
    if (product.stock < qty) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    // 🛒 If it's a bundle, validate stock of bundled items too
    if (product.isBundle && product.bundleItems?.length) {
      for (const bundleItem of product.bundleItems) {
        const subProduct = await Product.findById(bundleItem.productId);
        const requiredQty = bundleItem.quantity * qty;

        if (
          !subProduct ||
          subProduct.stock == null ||
          subProduct.stock < requiredQty
        ) {
          throw new ApiError(
            400,
            `Insufficient stock for bundle item: ${subProduct?.name || "Unknown"}`
          );
        }
      }
    }
    const itemTotal = product.price * qty;
    totalAmount += itemTotal;


    validatedItems.push({
      productId: product._id,
      quantity: qty,
      price: product.price,
    });
  }

  // 🧾 Coupon logic
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
console.log("oderID" , orderId)

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
          product.stock -= qty;
          await product.save();
        } else {
          console.warn(`Invalid quantity for product ${item.productId}:`, item.quantity);
        }

        if (product.isBundle && product.bundleItems?.length) {
          for (const bundleItem of product.bundleItems) {
            const subProduct = await Product.findById(bundleItem.productId);
            const subQty = Number(bundleItem.quantity) * qty;

            if (subProduct && !isNaN(subQty)) {
              subProduct.stock -= subQty;
              await subProduct.save();
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
