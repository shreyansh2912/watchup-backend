import { db } from '../db/index.js';
import { comments, users } from '../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const addComment = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim() === '') {
            return errorResponse(res, 400, "Comment content is required");
        }

        const [newComment] = await db.insert(comments).values({
            content,
            userId,
            videoId: parseInt(videoId)
        }).returning();

        // Fetch user details to return with the comment
        const [user] = await db.select({
            username: users.username,
            avatar: users.avatar
        }).from(users).where(eq(users.id, userId));

        return successResponse(res, 201, "Comment added", {
            ...newComment,
            user
        });

    } catch (error) {
        console.error("Add Comment Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getComments = async (req, res) => {
    try {
        const { videoId } = req.params;

        const videoComments = await db.query.comments.findMany({
            where: eq(comments.videoId, parseInt(videoId)),
            orderBy: [desc(comments.createdAt)],
            with: {
                user: {
                    columns: {
                        username: true,
                        avatar: true
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
        const userId = req.user.id;

        const [comment] = await db.select().from(comments).where(eq(comments.id, parseInt(id))).limit(1);

        if (!comment) {
            return errorResponse(res, 404, "Comment not found");
        }

        if (comment.userId !== userId) {
            return errorResponse(res, 403, "Not authorized to delete this comment");
        }

        await db.delete(comments).where(eq(comments.id, parseInt(id)));

        return successResponse(res, 200, "Comment deleted");

    } catch (error) {
        console.error("Delete Comment Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
