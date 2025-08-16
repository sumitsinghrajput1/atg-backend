// controllers/webhook.controller.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { Order } from '../models/Order';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const signature = req.headers['x-razorpay-signature'] as string;
  
  // 1. Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    throw new ApiError(400, 'Invalid webhook signature');
  }

  // 2. Process different webhook events
  const { event, payload } = req.body;

  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(payload.payment.entity);
      break;
      
    case 'payment.failed':
      await handlePaymentFailed(payload.payment.entity);
      break;
      
    case 'order.paid':
      await handleOrderPaid(payload.order.entity);
      break;
      
    case 'payment.authorized':
      await handlePaymentAuthorized(payload.payment.entity);
      break;
      
    default:
      console.log(`Unhandled webhook event: ${event}`);
  }

  // 3. Always return 200 OK to acknowledge receipt
  res.status(200).json({ status: 'ok' });
});

// Handle successful payment capture
const handlePaymentCaptured = async (payment: any) => {
  try {
    // Find order by razorpay order id
    const order = await Order.findOne({ 
      razorpayOrderId: payment.order_id 
    });

    if (order && order.paymentStatus !== 'success') {
      // Update order status
      order.paymentStatus = 'success';
      order.paymentId = payment.id;
      order.status = 'processing';
      await order.save();

      // Log success
      console.log(`Payment captured for order: ${order.orderId}, Amount: ₹${payment.amount/100}`);
      
      // TODO: Send confirmation email, SMS, push notification, etc.
      // await sendOrderConfirmationEmail(order);
      // await sendOrderConfirmationSMS(order);
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (payment: any) => {
  try {
    const order = await Order.findOne({ 
      razorpayOrderId: payment.order_id 
    });

    if (order) {
      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      await order.save();

      console.log(`Payment failed for order: ${order.orderId}, Reason: ${payment.error_reason || 'Unknown'}`);
      
      // TODO: Send payment failure notification
      // await sendPaymentFailureEmail(order, payment.error_description);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

// Handle order paid event (when entire order is marked as paid)
const handleOrderPaid = async (orderData: any) => {
  try {
    const order = await Order.findOne({ 
      razorpayOrderId: orderData.id 
    });

    if (order) {
      // Update order status if not already updated
      if (order.paymentStatus !== 'success') {
        order.paymentStatus = 'success';
        order.status = 'processing';
        await order.save();
      }

      console.log(`Order paid webhook received for order: ${order.orderId}`);
      
      // This event is typically fired after payment.captured
      // Use it for additional business logic if needed
      // TODO: Trigger inventory updates, send to fulfillment center, etc.
      // await updateInventorySystem(order);
      // await sendToFulfillmentCenter(order);
    }
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
};

// Handle payment authorized (but not yet captured)
const handlePaymentAuthorized = async (payment: any) => {
  try {
    const order = await Order.findOne({ 
      razorpayOrderId: payment.order_id 
    });

    if (order) {
      // Payment is authorized but not captured yet
      order.paymentStatus = 'pending'; // Keep as pending until captured
      order.paymentId = payment.id;
      await order.save();

      console.log(`Payment authorized for order: ${order.orderId}, Amount: ₹${payment.amount/100}`);
      
      // TODO: You might want to auto-capture or wait for manual capture
      // await razorpay.payments.capture(payment.id, payment.amount);
    }
  } catch (error) {
    console.error('Error handling payment authorized:', error);
  }
};
