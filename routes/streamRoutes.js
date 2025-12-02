import express from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to generate a secure stream key
const generateStreamKey = () => {
    return crypto.randomBytes(20).toString('hex');
};

// Get current stream key
router.get('/key', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        let user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If no key exists, generate one
        if (!user.streamKey) {
            const newKey = generateStreamKey();
            await db.update(users)
                .set({ streamKey: newKey })
                .where(eq(users.id, userId));
            user.streamKey = newKey;
        }

        res.json({ streamKey: user.streamKey });
    } catch (error) {
        console.error('Error fetching stream key:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset stream key
router.post('/key/reset', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const newKey = generateStreamKey();

        await db.update(users)
            .set({ streamKey: newKey })
            .where(eq(users.id, userId));

        res.json({ streamKey: newKey });
    } catch (error) {
        console.error('Error resetting stream key:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
