import { db } from '../db/index.js';
import { subscriptions, channels } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const toggleSubscription = async (req, res) => {
    try {
        const { channelId } = req.body;
        const userId = req.user.id;

        if (!channelId) {
            return errorResponse(res, 400, "Channel ID is required");
        }

        // Check if channel exists
        const [channel] = await db.select().from(channels).where(eq(channels.id, parseInt(channelId))).limit(1);
        if (!channel) {
            return errorResponse(res, 404, "Channel not found");
        }

        // Prevent subscribing to own channel
        if (channel.userId === userId) {
            return errorResponse(res, 400, "Cannot subscribe to your own channel");
        }

        // Check if already subscribed
        const [existingSub] = await db.select().from(subscriptions).where(
            and(
                eq(subscriptions.subscriberId, userId),
                eq(subscriptions.channelId, parseInt(channelId))
            )
        ).limit(1);

        if (existingSub) {
            // Unsubscribe
            await db.delete(subscriptions).where(
                and(
                    eq(subscriptions.subscriberId, userId),
                    eq(subscriptions.channelId, parseInt(channelId))
                )
            );
            return successResponse(res, 200, "Unsubscribed successfully", { subscribed: false });
        } else {
            // Subscribe
            await db.insert(subscriptions).values({
                subscriberId: userId,
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
        const userId = req.user ? req.user.id : null;

        if (!userId) {
            return successResponse(res, 200, "Subscription status", { subscribed: false });
        }

        const [existingSub] = await db.select().from(subscriptions).where(
            and(
                eq(subscriptions.subscriberId, userId),
                eq(subscriptions.channelId, parseInt(channelId))
            )
        ).limit(1);

        return successResponse(res, 200, "Subscription status", { subscribed: !!existingSub });

    } catch (error) {
        console.error("Get Subscription Status Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
