import express from 'express';
import { createPlan, getPlans, joinMembership } from '../controllers/membershipController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/channel/:channelId', getPlans);

// Protected routes
router.post('/create', verifyToken, createPlan);
router.post('/join', verifyToken, joinMembership);

export default router;
