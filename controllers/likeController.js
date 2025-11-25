import { db } from '../db/index.js';
import { likes, videos } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const toggleLike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { type } = req.body; // 'LIKE' or 'DISLIKE'
        const userId = req.user.id;

        if (!['LIKE', 'DISLIKE'].includes(type)) {
            return errorResponse(res, 400, "Invalid like type. Must be 'LIKE' or 'DISLIKE'");
        }

        // Check if video exists
        const [video] = await db.select().from(videos).where(eq(videos.id, parseInt(videoId))).limit(1);
        if (!video) {
            return errorResponse(res, 404, "Video not found");
        }

        // Check if user already liked/disliked this video
        const [existingLike] = await db.select().from(likes).where(
            and(
                eq(likes.userId, userId),
                eq(likes.videoId, parseInt(videoId))
            )
        ).limit(1);

        if (existingLike) {
            if (existingLike.type === type) {
                // Toggle off (remove like/dislike)
                await db.delete(likes).where(
                    and(
                        eq(likes.userId, userId),
                        eq(likes.videoId, parseInt(videoId))
                    )
                );
                return successResponse(res, 200, "Removed " + type.toLowerCase());
            } else {
                // Change type (e.g., from LIKE to DISLIKE)
                await db.update(likes)
                    .set({ type })
                    .where(
                        and(
                            eq(likes.userId, userId),
                            eq(likes.videoId, parseInt(videoId))
                        )
                    );
                return successResponse(res, 200, "Changed to " + type.toLowerCase());
            }
        } else {
            // Create new like/dislike
            await db.insert(likes).values({
                userId,
                videoId: parseInt(videoId),
                type
            });
            return successResponse(res, 201, "Added " + type.toLowerCase());
        }

    } catch (error) {
        console.error("Toggle Like Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getLikeStatus = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user ? req.user.id : null;

        // Get counts
        const allLikes = await db.select().from(likes).where(eq(likes.videoId, parseInt(videoId)));

        const likeCount = allLikes.filter(l => l.type === 'LIKE').length;
        const dislikeCount = allLikes.filter(l => l.type === 'DISLIKE').length;

        let userStatus = null;
        if (userId) {
            const userLike = allLikes.find(l => l.userId === userId);
            if (userLike) {
                userStatus = userLike.type;
            }
        }

        return successResponse(res, 200, "Like status fetched", {
            likes: likeCount,
            dislikes: dislikeCount,
            userStatus
        });

    } catch (error) {
        console.error("Get Like Status Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
