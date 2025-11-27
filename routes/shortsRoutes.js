import express from 'express';
import { getShortsFeed } from '../controllers/videoController.js';

const router = express.Router();

router.get('/feed', getShortsFeed);

export default router;
