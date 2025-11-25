import express from 'express';
import { addComment, getComments, deleteComment } from '../controllers/commentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/:videoId', verifyToken, addComment);
router.get('/:videoId', getComments);
router.delete('/:id', verifyToken, deleteComment);

export default router;
