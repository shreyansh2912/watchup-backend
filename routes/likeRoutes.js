import express from 'express';
import { toggleLike, getLikeStatus } from '../controllers/likeController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Optional auth middleware for getting status (to check if current user liked it)
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

router.post('/:videoId', verifyToken, toggleLike);
router.get('/:videoId/status', optionalAuth, getLikeStatus);

export default router;
