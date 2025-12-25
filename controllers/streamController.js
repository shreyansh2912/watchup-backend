import { db } from '../db/index.js';
import { streams } from '../db/schema/streams.js';
import { users } from '../db/schema/users.js';
import { channels } from '../db/schema/channels.js';
import { eq, and, desc } from 'drizzle-orm';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

// Setup stream metadata before going live
export const setupStream = async (req, res) => {
    try {
        const { title, description, category, chatEnabled, recordStream } = req.body;
        const userId = req.user.id;
        const channel = req.channel;

        if (!channel) {
            return errorResponse(res, 400, "Channel context required");
        }

        // Check if user already has an active stream
        const existingStream = await db.query.streams.findFirst({
            where: and(
                eq(streams.userId, userId),
                eq(streams.status, 'idle')
            )
        });

        let newStream;
        if (existingStream) {
            // Update existing idle stream
            [newStream] = await db.update(streams)
                .set({
                    title,
                    description,
                    category,
                    chatEnabled: chatEnabled !== undefined ? chatEnabled : true,
                    recordStream: recordStream !== undefined ? recordStream : true,
                    channelId: channel.id,
                    updatedAt: new Date(),
                })
                .where(eq(streams.id, existingStream.id))
                .returning();
        } else {
            // Create new stream
            [newStream] = await db.insert(streams).values({
                userId,
                channelId: channel.id,
                title,
                description,
                category,
                chatEnabled: chatEnabled !== undefined ? chatEnabled : true,
                recordStream: recordStream !== undefined ? recordStream : true,
                status: 'idle',
            }).returning();
        }

        return successResponse(res, 200, "Stream setup successful", newStream);
    } catch (error) {
        console.error("Setup Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Get current stream for authenticated user
export const getCurrentStream = async (req, res) => {
    try {
        const userId = req.user.id;

        const stream = await db.query.streams.findFirst({
            where: and(
                eq(streams.userId, userId),
                eq(streams.status, 'idle')
            ),
            with: {
                channel: true,
            }
        });

        if (!stream) {
            return successResponse(res, 200, "No active stream setup", null);
        }

        return successResponse(res, 200, "Stream fetched", stream);
    } catch (error) {
        console.error("Get Current Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Get all live streams (Discovery)
export const getLiveStreams = async (req, res) => {
    try {
        const { category, limit = 20 } = req.query;

        let whereClause = eq(streams.status, 'live');

        if (category) {
            whereClause = and(
                eq(streams.status, 'live'),
                eq(streams.category, category)
            );
        }

        const liveStreams = await db.query.streams.findMany({
            where: whereClause,
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        avatar: true,
                        streamKey: false, // Don't expose stream key
                    }
                },
                channel: true,
            },
            orderBy: [desc(streams.viewerCount)],
            limit: parseInt(limit),
        });

        return successResponse(res, 200, "Live streams fetched", liveStreams);
    } catch (error) {
        console.error("Get Live Streams Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Get stream by ID
export const getStreamById = async (req, res) => {
    try {
        const { id } = req.params;

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id)),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        avatar: true,
                        streamKey: false,
                    }
                },
                channel: true,
            }
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        return successResponse(res, 200, "Stream fetched", stream);
    } catch (error) {
        console.error("Get Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Update stream settings
export const updateStream = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, chatEnabled } = req.body;
        const userId = req.user.id;

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id))
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        if (stream.userId !== userId) {
            return errorResponse(res, 403, "Unauthorized");
        }

        const [updatedStream] = await db.update(streams)
            .set({
                title,
                description,
                category,
                chatEnabled,
                updatedAt: new Date(),
            })
            .where(eq(streams.id, parseInt(id)))
            .returning();

        return successResponse(res, 200, "Stream updated", updatedStream);
    } catch (error) {
        console.error("Update Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// End stream manually
export const endStream = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id))
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        if (stream.userId !== userId) {
            return errorResponse(res, 403, "Unauthorized");
        }

        if (stream.status !== 'live') {
            return errorResponse(res, 400, "Stream is not live");
        }

        // Calculate duration
        const duration = stream.startedAt
            ? Math.floor((new Date() - new Date(stream.startedAt)) / 1000)
            : 0;

        // Update stream status and user's isLive flag
        await db.transaction(async (tx) => {
            await tx.update(streams)
                .set({
                    status: 'ended',
                    endedAt: new Date(),
                    duration,
                    updatedAt: new Date(),
                })
                .where(eq(streams.id, parseInt(id)));

            await tx.update(users)
                .set({ isLive: false })
                .where(eq(users.id, userId));
        });

        return successResponse(res, 200, "Stream ended successfully");
    } catch (error) {
        console.error("End Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Join stream (increment viewer count)
export const joinStream = async (req, res) => {
    try {
        const { id } = req.params;

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id))
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        if (stream.status !== 'live') {
            return errorResponse(res, 400, "Stream is not live");
        }

        const newViewerCount = (stream.viewerCount || 0) + 1;
        const newPeakViewers = Math.max(newViewerCount, stream.peakViewers || 0);

        await db.update(streams)
            .set({
                viewerCount: newViewerCount,
                peakViewers: newPeakViewers,
                totalViews: (stream.totalViews || 0) + 1,
            })
            .where(eq(streams.id, parseInt(id)));

        return successResponse(res, 200, "Joined stream", { viewerCount: newViewerCount });
    } catch (error) {
        console.error("Join Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Leave stream (decrement viewer count)
export const leaveStream = async (req, res) => {
    try {
        const { id } = req.params;

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id))
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        const newViewerCount = Math.max((stream.viewerCount || 0) - 1, 0);

        await db.update(streams)
            .set({ viewerCount: newViewerCount })
            .where(eq(streams.id, parseInt(id)));

        return successResponse(res, 200, "Left stream", { viewerCount: newViewerCount });
    } catch (error) {
        console.error("Leave Stream Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

// Upload stream thumbnail
export const uploadStreamThumbnail = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!req.file) {
            return errorResponse(res, 400, "Thumbnail file is required");
        }

        const stream = await db.query.streams.findFirst({
            where: eq(streams.id, parseInt(id))
        });

        if (!stream) {
            return errorResponse(res, 404, "Stream not found");
        }

        if (stream.userId !== userId) {
            return errorResponse(res, 403, "Unauthorized");
        }

        const upload = await uploadOnCloudinary(req.file.path);
        if (!upload) {
            return errorResponse(res, 500, "Error uploading thumbnail");
        }

        const [updatedStream] = await db.update(streams)
            .set({
                thumbnailUrl: upload.secure_url,
                updatedAt: new Date(),
            })
            .where(eq(streams.id, parseInt(id)))
            .returning();

        return successResponse(res, 200, "Thumbnail uploaded", updatedStream);
    } catch (error) {
        console.error("Upload Thumbnail Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
