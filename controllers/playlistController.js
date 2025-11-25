import { db } from '../db/index.js';
import { playlists, playlistVideos, videos } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const createPlaylist = async (req, res) => {
    try {
        const { name, description, isPrivate } = req.body;
        const userId = req.user.id;

        if (!name) {
            return errorResponse(res, 400, "Playlist name is required");
        }

        const [newPlaylist] = await db.insert(playlists).values({
            name,
            description,
            isPrivate: isPrivate || false,
            userId
        }).returning();

        return successResponse(res, 201, "Playlist created", newPlaylist);
    } catch (error) {
        console.error("Create Playlist Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getUserPlaylists = async (req, res) => {
    try {
        const userId = req.user.id;

        const userPlaylists = await db.query.playlists.findMany({
            where: eq(playlists.userId, userId),
            orderBy: [desc(playlists.createdAt)]
        });

        return successResponse(res, 200, "Playlists fetched", userPlaylists);
    } catch (error) {
        console.error("Get Playlists Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getPlaylistById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        const playlist = await db.query.playlists.findFirst({
            where: eq(playlists.id, parseInt(id)),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        avatar: true
                    }
                }
            }
        });

        if (!playlist) {
            return errorResponse(res, 404, "Playlist not found");
        }

        // Check privacy
        if (playlist.isPrivate && playlist.userId !== userId) {
            return errorResponse(res, 403, "This playlist is private");
        }

        // Get videos in playlist
        const videosInPlaylist = await db.query.playlistVideos.findMany({
            where: eq(playlistVideos.playlistId, parseInt(id)),
            orderBy: [desc(playlistVideos.addedAt)],
            with: {
                video: {
                    with: {
                        channel: true
                    }
                }
            }
        });

        const formattedVideos = videosInPlaylist.map(item => ({
            ...item.video,
            addedAt: item.addedAt
        }));

        return successResponse(res, 200, "Playlist fetched", { ...playlist, videos: formattedVideos });

    } catch (error) {
        console.error("Get Playlist Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const addVideoToPlaylist = async (req, res) => {
    try {
        const { id } = req.params; // Playlist ID
        const { videoId } = req.body;
        const userId = req.user.id;

        const playlist = await db.query.playlists.findFirst({
            where: eq(playlists.id, parseInt(id))
        });

        if (!playlist) {
            return errorResponse(res, 404, "Playlist not found");
        }

        if (playlist.userId !== userId) {
            return errorResponse(res, 403, "Not authorized to modify this playlist");
        }

        // Check if video already exists
        const existing = await db.query.playlistVideos.findFirst({
            where: and(
                eq(playlistVideos.playlistId, parseInt(id)),
                eq(playlistVideos.videoId, parseInt(videoId))
            )
        });

        if (existing) {
            return errorResponse(res, 400, "Video already in playlist");
        }

        await db.insert(playlistVideos).values({
            playlistId: parseInt(id),
            videoId: parseInt(videoId)
        });

        return successResponse(res, 200, "Video added to playlist");

    } catch (error) {
        console.error("Add Video to Playlist Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const removeVideoFromPlaylist = async (req, res) => {
    try {
        const { id, videoId } = req.params; // Playlist ID, Video ID
        const userId = req.user.id;

        const playlist = await db.query.playlists.findFirst({
            where: eq(playlists.id, parseInt(id))
        });

        if (!playlist) {
            return errorResponse(res, 404, "Playlist not found");
        }

        if (playlist.userId !== userId) {
            return errorResponse(res, 403, "Not authorized to modify this playlist");
        }

        await db.delete(playlistVideos).where(
            and(
                eq(playlistVideos.playlistId, parseInt(id)),
                eq(playlistVideos.videoId, parseInt(videoId))
            )
        );

        return successResponse(res, 200, "Video removed from playlist");

    } catch (error) {
        console.error("Remove Video from Playlist Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const deletePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const playlist = await db.query.playlists.findFirst({
            where: eq(playlists.id, parseInt(id))
        });

        if (!playlist) {
            return errorResponse(res, 404, "Playlist not found");
        }

        if (playlist.userId !== userId) {
            return errorResponse(res, 403, "Not authorized to delete this playlist");
        }

        // Delete relations first
        await db.delete(playlistVideos).where(eq(playlistVideos.playlistId, parseInt(id)));
        await db.delete(playlists).where(eq(playlists.id, parseInt(id)));

        return successResponse(res, 200, "Playlist deleted");

    } catch (error) {
        console.error("Delete Playlist Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
