import express from 'express';
import { createReport, getReports } from '../controllers/reportController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createReport);
router.get('/', verifyToken, getReports); // Admin only in future, currently authenticated users

export default router;
