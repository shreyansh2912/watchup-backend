import express from 'express';
import { addToHistory, getHistory } from '../controllers/historyController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, addToHistory);
router.get('/', verifyToken, getHistory);

export default router;
