import express from 'express';
import { getChannelStats, getChannelVideos } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', verifyToken, getChannelStats);
router.get('/videos', verifyToken, getChannelVideos);

export default router;
