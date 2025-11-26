import { db } from '../db/index.js';
import { subscriptions, channels } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const toggleSubscription = async (req, res) => {
    try {
        const { channelId } = req.body;

        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const subscriberChannelId = req.channel.id;

        if (!channelId) {
            return errorResponse(res, 400, "Channel ID is required");
        }

        // Check if channel exists
        const [channel] = await db.select().from(channels).where(eq(channels.id, parseInt(channelId))).limit(1);
        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // Prevent subscribing to own channel
        if (parseInt(channelId) === subscriberChannelId) {
            return errorResponse(res, 400, "Cannot subscribe to your own channel");
        }

        // Check if already subscribed
        const [existingSub] = await db.select().from(subscriptions).where(
            and(
                eq(subscriptions.subscriberChannelId, subscriberChannelId),
                eq(subscriptions.channelId, parseInt(channelId))
            )
        ).limit(1);

        if (existingSub) {
            // Unsubscribe
            await db.delete(subscriptions).where(
                and(
                    eq(subscriptions.subscriberChannelId, subscriberChannelId),
                    eq(subscriptions.channelId, parseInt(channelId))
                )
            );
            return successResponse(res, 200, "Unsubscribed successfully", { subscribed: false });
        } else {
            // Subscribe
            await db.insert(subscriptions).values({
                subscriberChannelId,
                channelId: parseInt(channelId)
            });
            return successResponse(res, 201, "Subscribed successfully", { subscribed: true });
        }

    } catch (error) {
        console.error("Toggle Subscription Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const { channelId } = req.params;
        const subscriberChannelId = req.channel ? req.channel.id : null;

        if (!subscriberChannelId) {
            return successResponse(res, 200, "Subscription status", { subscribed: false });
        }

        const [existingSub] = await db.select().from(subscriptions).where(
            and(
                eq(subscriptions.subscriberChannelId, subscriberChannelId),
                eq(subscriptions.channelId, parseInt(channelId))
            )
        ).limit(1);

        return successResponse(res, 200, "Subscription status", { subscribed: !!existingSub });

    } catch (error) {
        console.error("Get Subscription Status Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getSubscribedChannels = async (req, res) => {
    try {
        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const subscriberChannelId = req.channel.id;

        const subscribedChannels = await db.select({
            id: channels.id,
            name: channels.name,
            handle: channels.handle,
            avatarUrl: channels.avatarUrl
        })
            .from(subscriptions)
            .innerJoin(channels, eq(subscriptions.channelId, channels.id))
            .where(eq(subscriptions.subscriberChannelId, subscriberChannelId));

        return successResponse(res, 200, "Subscribed channels fetched", subscribedChannels);
    } catch (error) {
        console.error("Get Subscribed Channels Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
