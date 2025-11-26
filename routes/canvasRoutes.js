import express from 'express';
import { db } from '../db/index.js';
import { canvasFiles } from '../db/schema/canvasFiles.js';
import { eq, desc } from 'drizzle-orm';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all files for the authenticated user
router.get('/', verifyToken, async (req, res) => {
    try {
        const files = await db.select()
            .from(canvasFiles)
            .where(eq(canvasFiles.userId, req.user.id))
            .orderBy(desc(canvasFiles.createdAt));

        res.json(files);
    } catch (error) {
        console.error('Error fetching canvas files:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new file
router.post('/', verifyToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    try {
        const [newFile] = await db.insert(canvasFiles)
            .values({
                userId: req.user.id,
                name,
                data: [], // Empty array initially
            })
            .returning();

        res.status(201).json(newFile);
    } catch (error) {
        console.error('Error creating canvas file:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a file
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;

    try {
        const [updatedFile] = await db.update(canvasFiles)
            .set({
                data,
                updatedAt: new Date()
            })
            .where(eq(canvasFiles.id, id))
            .returning();

        if (!updatedFile) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.json(updatedFile);
    } catch (error) {
        console.error('Error updating canvas file:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a file
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await db.delete(canvasFiles)
            .where(eq(canvasFiles.id, id));

        res.json({ message: 'File deleted' });
    } catch (error) {
        console.error('Error deleting canvas file:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
