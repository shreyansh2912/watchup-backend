import { db } from '../db/index.js';
import { channels, videos, users, subscriptions } from '../db/schema/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

export const createChannel = async (req, res) => {
    try {
        const { name, handle, description } = req.body;
        const userId = req.user.id;

        if (!name || !handle) {
            return errorResponse(res, 400, "Name and handle are required");
        }

        // Check if handle is taken
        const [existingChannel] = await db.select().from(channels).where(eq(channels.handle, handle)).limit(1);
        if (existingChannel) {
            return errorResponse(res, 400, "Handle is already taken");
        }

        let avatarUrl = req.user.avatar; // Default to user avatar
        let bannerUrl = null;

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

        const [newChannel] = await db.insert(channels).values({
            userId,
            name,
            handle,
            description,
            avatarUrl,
            bannerUrl
        }).returning();

        return successResponse(res, 201, "Channel created successfully", newChannel);

    } catch (error) {
        console.error("Create Channel Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getUserChannels = async (req, res) => {
    try {
        const userId = req.user.id;
        const userChannels = await db.select().from(channels).where(eq(channels.userId, userId));
        return successResponse(res, 200, "User channels fetched", userChannels);
    } catch (error) {
        console.error("Get User Channels Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getChannelById = async (req, res) => {
    try {
        const { id } = req.params;
        // We need to know which channel is viewing this to check subscription status
        // This will come from the X-Channel-Id header processed by middleware
        const viewerChannelId = req.channel ? req.channel.id : null;

        const channel = await db.query.channels.findFirst({
            where: eq(channels.id, parseInt(id)),
            with: {
                user: {
                    columns: {
                        username: true
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

        // Check if viewer is subscribed
        let isSubscribed = false;
        if (viewerChannelId) {
            const [sub] = await db.select().from(subscriptions).where(
                sql`${subscriptions.subscriberChannelId} = ${viewerChannelId} AND ${subscriptions.channelId} = ${channel.id}`
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
        const { id } = req.params;
        const userId = req.user.id;
        const { name, description, handle } = req.body;

        // Verify ownership
        const [channel] = await db.select().from(channels).where(eq(channels.id, parseInt(id))).limit(1);

        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        if (channel.userId !== userId) {
            return errorResponse(res, 403, "You do not own this channel");
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
