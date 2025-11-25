import express from 'express';
import { getChannelById, updateChannel, getMyChannel } from '../controllers/channelController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
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

router.get('/my-channel', verifyToken, getMyChannel);
router.get('/:id', optionalAuth, getChannelById);
router.put('/', verifyToken, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), updateChannel);

export default router;
