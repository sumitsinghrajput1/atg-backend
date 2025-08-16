import { Router } from 'express';
import { createPaymentOrder } from '../controllers/payment';
import { isLoggedIn } from '../middlewares/auth';


const router = Router();

// POST /api/payment/order - Create payment order
router.post('/order',  isLoggedIn,createPaymentOrder);

export default router;
