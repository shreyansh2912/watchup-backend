import { db } from '../db/index.js';
import { channels, videos, users, subscriptions } from '../db/schema/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

export const getChannelById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user ? req.user.id : null;

        const channel = await db.query.channels.findFirst({
            where: eq(channels.id, parseInt(id)),
            with: {
                user: {
                    columns: {
                        username: true,
                        email: true // Maybe hide email?
                    }
                }
            }
        });

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // Get subscriber count
        const subCountResult = await db.select({ count: sql`count(*)` }).from(subscriptions).where(eq(subscriptions.channelId, channel.id));
        const subscriberCount = parseInt(subCountResult[0].count);

        // Get videos
        const channelVideos = await db.query.videos.findMany({
            where: eq(videos.channelId, channel.id),
            orderBy: [desc(videos.createdAt)],
            with: {
                channel: true
            }
        });

        // Check if current user is subscribed
        let isSubscribed = false;
        if (currentUserId) {
            const [sub] = await db.select().from(subscriptions).where(
                sql`${subscriptions.subscriberId} = ${currentUserId} AND ${subscriptions.channelId} = ${channel.id}`
            ).limit(1);
            isSubscribed = !!sub;
        }

        return successResponse(res, 200, "Channel fetched", {
            ...channel,
            subscriberCount,
            isSubscribed,
            videos: channelVideos
        });

    } catch (error) {
        console.error("Get Channel Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const updateChannel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, handle } = req.body;

        // Find user's channel
        const [channel] = await db.select().from(channels).where(eq(channels.userId, userId)).limit(1);

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        let avatarUrl = channel.avatarUrl;
        let bannerUrl = channel.bannerUrl;

        if (req.files) {
            if (req.files.avatar) {
                const avatarUpload = await uploadOnCloudinary(req.files.avatar[0].path);
                if (avatarUpload) avatarUrl = avatarUpload.secure_url;
            }
            if (req.files.banner) {
                const bannerUpload = await uploadOnCloudinary(req.files.banner[0].path);
                if (bannerUpload) bannerUrl = bannerUpload.secure_url;
            }
        }

        const [updatedChannel] = await db.update(channels)
            .set({
                name: name || channel.name,
                description: description || channel.description,
                handle: handle || channel.handle,
                avatarUrl,
                bannerUrl,
                updatedAt: new Date()
            })
            .where(eq(channels.id, channel.id))
            .returning();

        return successResponse(res, 200, "Channel updated", updatedChannel);

    } catch (error) {
        console.error("Update Channel Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getMyChannel = async (req, res) => {
    try {
        const userId = req.user.id;
        const [channel] = await db.select().from(channels).where(eq(channels.userId, userId)).limit(1);

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // Redirect to getChannelById logic or just return basic info
        // For simplicity, let's just reuse the ID and call the logic internally or redirect client
        // But for API, let's just return the ID so client can fetch full details
        return successResponse(res, 200, "My Channel ID", { id: channel.id });

    } catch (error) {
        console.error("Get My Channel Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
}
