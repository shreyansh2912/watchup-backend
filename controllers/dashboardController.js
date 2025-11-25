import { db } from '../db/index.js';
import { videos, channels, likes, subscriptions } from '../db/schema/index.js';
import { eq, sql, desc, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const getChannelStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's channel
        const [channel] = await db.select().from(channels).where(eq(channels.userId, userId)).limit(1);

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // 1. Total Videos & Total Views
        const [videoStats] = await db
            .select({
                totalVideos: sql`count(*)`,
                totalViews: sql`sum(${videos.views})`
            })
            .from(videos)
            .where(eq(videos.channelId, channel.id));

        // 2. Total Subscribers
        // We can use the pre-calculated field in channel table or count from subscribers table.
        // Using the table count is more accurate if the field isn't perfectly synced.
        const [subStats] = await db
            .select({ count: sql`count(*)` })
            .from(subscriptions)
            .where(eq(subscriptions.channelId, channel.id));

        // 3. Total Likes
        // Join likes with videos to filter by channel
        const [likeStats] = await db
            .select({ count: sql`count(*)` })
            .from(likes)
            .innerJoin(videos, eq(likes.videoId, videos.id))
            .where(and(
                eq(videos.channelId, channel.id),
                eq(likes.type, 'like')
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
        const userId = req.user.id;

        const [channel] = await db.select().from(channels).where(eq(channels.userId, userId)).limit(1);

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // Get videos with like/comment counts (optional, but good for dashboard)
        // For now, just basic video info + views + date
        const channelVideos = await db.query.videos.findMany({
            where: eq(videos.channelId, channel.id),
            orderBy: [desc(videos.createdAt)]
        });

        return successResponse(res, 200, "Channel videos fetched", channelVideos);

    } catch (error) {
        console.error("Get Channel Videos Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
