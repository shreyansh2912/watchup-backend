import express from 'express';
import { createChannel, getUserChannels, getChannelById, updateChannel, getChannelByUsername } from '../controllers/channelController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/:id', optionalVerifyToken, getChannelById);
router.get('/username/:username', optionalVerifyToken, getChannelByUsername);

// Protected routes
router.post('/', verifyToken, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), createChannel);

router.get('/', verifyToken, getUserChannels);

router.put('/:id', verifyToken, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), updateChannel);

export default router;
