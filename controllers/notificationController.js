import { db } from '../db/index.js';
import { notifications, channels, videos } from '../db/schema/index.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const getNotifications = async (req, res) => {
    try {
        const channelId = req.channel.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const userNotifications = await db.query.notifications.findMany({
            where: eq(notifications.recipientChannelId, channelId),
            orderBy: [desc(notifications.createdAt)],
            limit: limit,
            offset: offset,
            with: {
                sender: {
                    columns: {
                        name: true,
                        handle: true,
                        avatarUrl: true
                    }
                },
                video: {
                    columns: {
                        title: true,
                        thumbnailUrl: true
                    }
                }
            }
        });

        const total = await db.select({ count: count() })
            .from(notifications)
            .where(eq(notifications.recipientChannelId, channelId));

        return successResponse(res, 200, 'Notifications fetched successfully', {
            notifications: userNotifications,
            pagination: {
                page,
                limit,
                total: total[0].count,
                totalPages: Math.ceil(total[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const channelId = req.channel.id;
        const unreadCount = await db.select({ count: count() })
            .from(notifications)
            .where(and(
                eq(notifications.recipientChannelId, channelId),
                eq(notifications.isRead, false)
            ));

        return successResponse(res, 200, 'Unread count fetched', { count: unreadCount[0].count });
    } catch (error) {
        console.error('Get Unread Count Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const channelId = req.channel.id;

        await db.update(notifications)
            .set({ isRead: true })
            .where(and(
                eq(notifications.id, id),
                eq(notifications.recipientChannelId, channelId)
            ));

        return successResponse(res, 200, 'Notification marked as read');
    } catch (error) {
        console.error('Mark Read Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const channelId = req.channel.id;

        await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.recipientChannelId, channelId));

        return successResponse(res, 200, 'All notifications marked as read');
    } catch (error) {
        console.error('Mark All Read Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};
