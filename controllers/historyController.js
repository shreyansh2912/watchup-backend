import { db } from '../db/index.js';
import { history, videos, channels } from '../db/schema/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const addToHistory = async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!req.channel) {
            // Optional: if no channel context, maybe don't record history or record to default?
            // For now, let's require channel context for history
            return errorResponse(res, 400, "Channel context required");
        }
        const channelId = req.channel.id;

        if (!videoId) {
            return errorResponse(res, 400, "Video ID is required");
        }

        // Check if already in history
        const [existingEntry] = await db.select().from(history).where(
            and(
                eq(history.channelId, channelId),
                eq(history.videoId, parseInt(videoId))
            )
        ).limit(1);

        if (existingEntry) {
            // Update timestamp
            await db.update(history)
                .set({ watchedAt: new Date() })
                .where(
                    and(
                        eq(history.channelId, channelId),
                        eq(history.videoId, parseInt(videoId))
                    )
                );
        } else {
            // Add new entry
            await db.insert(history).values({
                channelId,
                videoId: parseInt(videoId)
            });
        }

        return successResponse(res, 200, "Added to history");

    } catch (error) {
        console.error("Add History Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getHistory = async (req, res) => {
    try {
        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const channelId = req.channel.id;

        const historyItems = await db.query.history.findMany({
            where: eq(history.channelId, channelId),
            orderBy: [desc(history.watchedAt)],
            with: {
                video: {
                    with: {
                        channel: true
                    }
                }
            }
        });

        // Flatten structure if needed, or return as is. 
        // Drizzle returns { ...historyFields, video: { ...videoFields, channel: ... } }
        // Let's map it to return a list of videos with watchedAt
        const formattedHistory = historyItems.map(item => ({
            ...item.video,
            watchedAt: item.watchedAt
        }));

        return successResponse(res, 200, "History fetched", formattedHistory);

    } catch (error) {
        console.error("Get History Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
