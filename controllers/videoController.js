import { db } from '../db/index.js';
import { videos } from '../db/schema/videos.js';
import { subscriptions } from '../db/schema/subscriptions.js';
import { notifications } from '../db/schema/notifications.js';
import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

const generateSlug = (channelName) => {
    const randomStr = Math.random().toString(36).substring(2, 10);
    const channelSlug = channelName
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
    return `${randomStr}-${channelSlug}`;
};

export const uploadVideo = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const channel = req.channel;

        if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
            return errorResponse(res, 400, "Video and thumbnail are required");
        }

        const videoLocalPath = req.files.videoFile[0].path;
        const thumbnailLocalPath = req.files.thumbnail[0].path;

        const videoUpload = await uploadOnCloudinary(videoLocalPath, true);
        const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

        if (!videoUpload || !thumbnailUpload) {
            return errorResponse(res, 500, 'Error uploading files to Cloudinary');
        }

        const sanitizeForDB = (str) => {
            if (!str) return str;
            return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        };

        const slug = generateSlug(channel.name);

        // Save to DB with Transaction
        let newVideo;
        try {
            newVideo = await db.transaction(async (tx) => {
                const [video] = await tx.insert(videos).values({
                    title: sanitizeForDB(title),
                    description: sanitizeForDB(description),
                    url: videoUpload.secure_url,
                    publicId: videoUpload.public_id,
                    thumbnailUrl: thumbnailUpload.secure_url,
                    channelId: channel.id,
                    duration: Math.round(videoUpload.duration || 0),
                    isShort: (videoUpload.duration || 0) < 60,
                    visibility: req.body.visibility || 'public',
                    slug: slug,
                }).returning();
                return video;
            });
        } catch (dbError) {
            if (videoUpload?.public_id) {
                await deleteFromCloudinary(videoUpload.public_id, 'video');
            }
            if (thumbnailUpload?.public_id) {
                await deleteFromCloudinary(thumbnailUpload.public_id, 'image');
            }
            throw dbError;
        }

        try {
            const subscribers = await db.query.subscriptions.findMany({
                where: eq(subscriptions.channelId, channel.id),
                columns: {
                    subscriberChannelId: true
                }
            });

            if (subscribers.length > 0) {
                const notificationValues = subscribers.map(sub => ({
                    recipientChannelId: sub.subscriberChannelId,
                    senderChannelId: channel.id,
                    type: 'VIDEO_UPLOAD',
                    videoId: newVideo.id,
                }));

                await db.insert(notifications).values(notificationValues);
            }
        } catch (notifError) {
            console.error('Error creating notifications:', notifError);
        }

        return successResponse(res, 201, 'Video uploaded successfully', newVideo);
    } catch (error) {
        console.error('Upload Video Error:', error);
        return errorResponse(res, 500, 'Server Error', error.message);
    }
};

export const getAllVideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        const allVideos = await db.query.videos.findMany({
            where: eq(videos.visibility, 'public'), // Only show public videos in general feed
            orderBy: [desc(videos.createdAt)],
            limit: limit,
            offset: offset,
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

        // Try to find by slug first
        let video = await db.query.videos.findFirst({
            where: eq(videos.slug, id),
            with: {
                channel: true,
            },
        });

        // Fallback to ID if not found and id is numeric
        if (!video && !isNaN(id)) {
            video = await db.query.videos.findFirst({
                where: eq(videos.id, parseInt(id)),
                with: {
                    channel: true,
                },
            });
        }

        if (!video) {
            return errorResponse(res, 404, 'Video not found');
        }

        // Check Visibility
        if (video.visibility === 'private') {
            // Only owner can view
            if (!req.channel || req.channel.id !== video.channelId) {
                return errorResponse(res, 403, 'This video is private');
            }
        } else if (video.visibility === 'members-only') {
            // Owner can always view
            const isOwner = req.channel && req.channel.id === video.channelId;
            if (!isOwner) {
                // Check if user is a member
                // We need userId from req.user (authenticated user)
                if (!req.user) {
                    return errorResponse(res, 401, 'Login required to view members-only content');
                }

                // Check active membership for this channel
                const member = await db.query.channelMembers.findFirst({
                    where: (members, { and, eq, gt }) => and(
                        eq(members.userId, req.user.id),
                        eq(members.status, 'active'),
                        // We need to join with memberships to check channelId, or if we stored channelId in channelMembers (we didn't directly, but via membershipId)
                        // Let's do a join or two-step lookup.
                        // Actually, let's fetch membership details
                    ),
                    with: {
                        membership: true
                    }
                });

                // Filter for correct channel
                const hasMembership = member && member.membership.channelId === video.channelId;

                if (!hasMembership) {
                    return errorResponse(res, 403, 'This video is for members only. Please join the channel to watch.');
                }
            }
        }

        // Increment views (simple implementation)
        // Note: Using ID for update is safer/easier since we have the video object now
        await db.update(videos)
            .set({ views: video.views + 1 })
            .where(eq(videos.id, video.id));

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
        // We require the user to be switched into the channel that owns the video
        if (!req.channel || video.channelId !== req.channel.id) {
            // Alternative: allow if req.user.id owns video.channel.userId
            // But for strict channel mode:
            return errorResponse(res, 403, "You are not authorized to delete this video (Wrong Channel Context)");
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

export const getShortsFeed = async (req, res) => {
    try {
        // Fetch random shorts (or latest)
        // Using random sort for "feed" feel
        const shortsFeed = await db.query.videos.findMany({
            where: eq(videos.isShort, true),
            orderBy: sql`RANDOM()`,
            limit: 10,
            with: {
                channel: true
            }
        });

        return successResponse(res, 200, "Shorts feed fetched", shortsFeed);
    } catch (error) {
        console.error("Get Shorts Feed Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

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
