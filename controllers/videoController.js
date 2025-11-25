import { db } from '../db/index.js';
import { videos, channels } from '../db/schema/index.js';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const uploadVideo = async (req, res) => {
    try {
        const { title, description } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
            return errorResponse(res, 400, 'Video file and thumbnail are required');
        }

        // Get user's channel
        const [channel] = await db.select().from(channels).where(eq(channels.userId, userId)).limit(1);
        if (!channel) {
            return errorResponse(res, 404, 'Channel not found for this user');
        }

        const videoLocalPath = req.files.videoFile[0].path;
        const thumbnailLocalPath = req.files.thumbnail[0].path;

        // Upload to Cloudinary
        const videoUpload = await uploadOnCloudinary(videoLocalPath);
        const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

        if (!videoUpload || !thumbnailUpload) {
            return errorResponse(res, 500, 'Error uploading files to Cloudinary');
        }

        // Save to DB
        const [newVideo] = await db.insert(videos).values({
            title,
            description,
            url: videoUpload.secure_url,
            thumbnailUrl: thumbnailUpload.secure_url,
            channelId: channel.id,
            duration: Math.round(videoUpload.duration || 0),
        }).returning();

        return successResponse(res, 201, 'Video uploaded successfully', newVideo);
    } catch (error) {
        console.error('Upload Video Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const getAllVideos = async (req, res) => {
    try {
        const allVideos = await db.query.videos.findMany({
            orderBy: [desc(videos.createdAt)],
            with: {
                channel: true, // Fetch channel details
            },
        });

        return successResponse(res, 200, 'Videos fetched successfully', allVideos);
    } catch (error) {
        console.error('Get All Videos Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await db.query.videos.findFirst({
            where: eq(videos.id, parseInt(id)),
            with: {
                channel: true,
            },
        });

        if (!video) {
            return errorResponse(res, 404, 'Video not found');
        }

        // Increment views (simple implementation)
        await db.update(videos)
            .set({ views: video.views + 1 })
            .where(eq(videos.id, parseInt(id)));

        return successResponse(res, 200, 'Video fetched successfully', video);
    } catch (error) {
        console.error('Get Video Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const video = await db.query.videos.findFirst({
            where: eq(videos.id, parseInt(id)),
            with: {
                channel: true
            }
        });

        if (!video) {
            return errorResponse(res, 404, "Video not found");
        }

        // Check ownership
        if (video.channel.userId !== userId) {
            return errorResponse(res, 403, "You are not authorized to delete this video");
        }

        // Delete from Cloudinary (Extract public ID logic needed, skipping for now or assuming URL structure)
        // For production, store public_id in DB. For now, just delete from DB.

        await db.delete(videos).where(eq(videos.id, parseInt(id)));

        return successResponse(res, 200, "Video deleted successfully");

    } catch (error) {
        console.error("Delete Video Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
}

export const searchVideos = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return errorResponse(res, 400, "Search query is required");
        }

        const searchResults = await db.query.videos.findMany({
            where: or(
                ilike(videos.title, `%${query}%`),
                ilike(videos.description, `%${query}%`)
            ),
            with: {
                channel: true
            },
            orderBy: [desc(videos.createdAt)]
        });

        return successResponse(res, 200, "Search results", searchResults);
    } catch (error) {
        console.error("Search Videos Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
