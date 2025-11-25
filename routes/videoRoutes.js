import express from 'express';
import { uploadVideo, getAllVideos, getVideoById, deleteVideo, searchVideos } from '../controllers/videoController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/search', searchVideos);
router.get('/', getAllVideos);
router.get('/:id', getVideoById);

router.post('/upload', verifyToken, upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), uploadVideo);

router.delete('/:id', verifyToken, deleteVideo);

export default router;
