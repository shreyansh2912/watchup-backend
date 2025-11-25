import express from 'express';
import {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist
} from '../controllers/playlistController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createPlaylist);
router.get('/my-playlists', verifyToken, getUserPlaylists);
router.get('/:id', optionalVerifyToken, getPlaylistById);
router.post('/:id/videos', verifyToken, addVideoToPlaylist);
router.delete('/:id/videos/:videoId', verifyToken, removeVideoFromPlaylist);
router.delete('/:id', verifyToken, deletePlaylist);

export default router;
