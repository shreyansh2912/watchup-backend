import { db } from '../db/index.js';
import { memberships } from '../db/schema/memberships.js';
import { channelMembers } from '../db/schema/channel_members.js';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const createPlan = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const channel = req.channel;

        if (!channel) {
            return errorResponse(res, 400, "Channel context required");
        }

        const [newPlan] = await db.insert(memberships).values({
            channelId: channel.id,
            name,
            description,
            price,
        }).returning();

        return successResponse(res, 201, "Membership plan created", newPlan);
    } catch (error) {
        console.error("Create Plan Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getPlans = async (req, res) => {
    try {
        const { channelId } = req.params;

        const plans = await db.query.memberships.findMany({
            where: and(
                eq(memberships.channelId, parseInt(channelId)),
                eq(memberships.isActive, true)
            )
        });

        return successResponse(res, 200, "Plans fetched", plans);
    } catch (error) {
        console.error("Get Plans Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const joinMembership = async (req, res) => {
    try {
        const { membershipId } = req.body;
        const userId = req.user.id;

        // Verify membership exists
        const plan = await db.query.memberships.findFirst({
            where: eq(memberships.id, parseInt(membershipId))
        });

        if (!plan) {
            return errorResponse(res, 404, "Membership plan not found");
        }

        // Check if already a member
        const existingMember = await db.query.channelMembers.findFirst({
            where: and(
                eq(channelMembers.userId, userId),
                eq(channelMembers.membershipId, parseInt(membershipId)),
                eq(channelMembers.status, 'active')
            )
        });

        if (existingMember) {
            return errorResponse(res, 400, "Already a member");
        }

        // TODO: Integrate Payment Gateway here (Stripe/Razorpay)
        // For now, simulate successful payment and activation

        const [newMember] = await db.insert(channelMembers).values({
            userId,
            membershipId: parseInt(membershipId),
            status: 'active',
            startDate: new Date(),
            // endDate: calculate based on duration if applicable
        }).returning();

        return successResponse(res, 201, "Joined membership successfully", newMember);

    } catch (error) {
        console.error("Join Membership Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
