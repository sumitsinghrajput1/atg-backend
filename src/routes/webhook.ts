// routes/webhook.routes.ts
import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook';

const router = Router();

// Razorpay webhook endpoint
router.post('/razorpay', handleRazorpayWebhook);

export default router;
