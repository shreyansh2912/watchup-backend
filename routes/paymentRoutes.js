import express from 'express';
import { createStripeCheckoutSession, createRazorpayOrder, handleStripeWebhook, handleRazorpayWebhook } from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-stripe-session', verifyToken, createStripeCheckoutSession);
router.post('/create-razorpay-order', verifyToken, createRazorpayOrder);

// Webhooks (Note: Stripe webhook needs raw body, handled in server.js or specific middleware)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);

export default router;
