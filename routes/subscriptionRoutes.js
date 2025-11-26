import express from 'express';
import { toggleSubscription, getSubscriptionStatus, getSubscribedChannels } from '../controllers/subscriptionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return next();

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        req.user = verified;
    } catch (err) {
        // Invalid token, just proceed as guest
    }
    next();
};

router.post('/', verifyToken, toggleSubscription);
router.get('/user', verifyToken, getSubscribedChannels);
router.get('/:channelId/status', optionalAuth, getSubscriptionStatus);

export default router;
