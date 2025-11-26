import jwt from 'jsonwebtoken';

import { db } from '../db/index.js';
import { channels } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    // console.log("Auth Header:", authHeader);
    const token = authHeader?.split(' ')[1];

    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ message: 'Access Denied: No Token Provided' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        // console.log("Token verified:", verified);
        req.user = verified;

        // Handle Channel Context
        const channelIdHeader = req.header('X-Channel-Id');
        if (channelIdHeader) {
            const channelId = parseInt(channelIdHeader);
            const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);

            if (channel && channel.userId === req.user.id) {
                req.channel = channel;
            } else {
                // Invalid channel or not owned by user
                return res.status(403).json({ message: 'Access Denied: Invalid Channel Context' });
            }
        } else {
            // Fallback: Try to find the first channel owned by the user
            const [defaultChannel] = await db.select().from(channels).where(eq(channels.userId, req.user.id)).limit(1);
            if (defaultChannel) {
                req.channel = defaultChannel;
            }
        }

        next();
    } catch (err) {
        console.log("Token verification failed:", err.message);
        res.status(400).json({ message: 'Invalid Token' });
    }
}

export const optionalVerifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_change_me');
        req.user = verified;

        // Handle Channel Context (Optional)
        const channelIdHeader = req.header('X-Channel-Id');
        if (channelIdHeader) {
            const channelId = parseInt(channelIdHeader);
            const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
            if (channel && channel.userId === req.user.id) {
                req.channel = channel;
            }
        } else {
            // Fallback
            const [defaultChannel] = await db.select().from(channels).where(eq(channels.userId, req.user.id)).limit(1);
            if (defaultChannel) {
                req.channel = defaultChannel;
            }
        }

        next();
    } catch (err) {
        // If token is invalid, just treat as unauthenticated
        req.user = null;
        next();
    }
};
