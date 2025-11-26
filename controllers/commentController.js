import { db } from '../db/index.js';
import { comments, channels } from '../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const addComment = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { content } = req.body;

        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const channelId = req.channel.id;

        if (!content || content.trim() === '') {
            return errorResponse(res, 400, "Comment content is required");
        }

        const [newComment] = await db.insert(comments).values({
            content,
            channelId,
            videoId: parseInt(videoId)
        }).returning();

        // Fetch channel details to return with the comment
        const [channel] = await db.select({
            username: channels.name, // Using channel name as username equivalent
            avatar: channels.avatarUrl
        }).from(channels).where(eq(channels.id, channelId));

        return successResponse(res, 201, "Comment added", {
            ...newComment,
            user: channel // Frontend expects 'user' object for display
        });

    } catch (error) {
        console.error("Add Comment Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getComments = async (req, res) => {
    try {
        const { videoId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        const videoComments = await db.query.comments.findMany({
            where: eq(comments.videoId, parseInt(videoId)),
            orderBy: [desc(comments.createdAt)],
            limit: limit,
            offset: offset,
            with: {
                channel: {
                    columns: {
                        name: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            }
        });

        return successResponse(res, 200, "Comments fetched", videoComments);

    } catch (error) {
        console.error("Get Comments Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }

        const [comment] = await db.select().from(comments).where(eq(comments.id, parseInt(id))).limit(1);

        if (!comment) {
            return errorResponse(res, 404, "Comment not found");
        }

        if (comment.channelId !== req.channel.id) {
            return errorResponse(res, 403, "Not authorized to delete this comment");
        }

        await db.delete(comments).where(eq(comments.id, parseInt(id)));

        return successResponse(res, 200, "Comment deleted");

    } catch (error) {
        console.error("Delete Comment Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
