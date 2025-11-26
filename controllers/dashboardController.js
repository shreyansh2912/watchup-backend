import { db } from '../db/index.js';
import { videos, channels, likes, subscriptions } from '../db/schema/index.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const getChannelStats = async (req, res) => {
    try {
        const channelId = req.channel.id;

        // 1. Total Videos & Total Views
        const [videoStats] = await db
            .select({
                totalVideos: sql`count(*)`,
                totalViews: sql`sum(${videos.views})`
            })
            .from(videos)
            .where(eq(videos.channelId, channelId));

        // 2. Total Subscribers
        const [subStats] = await db
            .select({ count: sql`count(*)` })
            .from(subscriptions)
            .where(eq(subscriptions.channelId, channelId));

        // 3. Total Likes
        const [likeStats] = await db
            .select({ count: sql`count(*)` })
            .from(likes)
            .innerJoin(videos, eq(likes.videoId, videos.id))
            .where(and(
                eq(videos.channelId, channelId),
                eq(likes.type, 'LIKE')
            ));

        const stats = {
            totalSubscribers: parseInt(subStats?.count || 0),
            totalVideos: parseInt(videoStats?.totalVideos || 0),
            totalViews: parseInt(videoStats?.totalViews || 0),
            totalLikes: parseInt(likeStats?.count || 0)
        };

        return successResponse(res, 200, "Channel stats fetched", stats);

    } catch (error) {
        console.error("Get Channel Stats Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getChannelVideos = async (req, res) => {
    try {
        const channelId = req.channel.id;

        const channelVideos = await db.query.videos.findMany({
            where: eq(videos.channelId, channelId),
            orderBy: [desc(videos.createdAt)]
        });

        return successResponse(res, 200, "Channel videos fetched", channelVideos);

    } catch (error) {
        console.error("Get Channel Videos Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
