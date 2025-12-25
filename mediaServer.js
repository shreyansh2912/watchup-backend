import NodeMediaServer from 'node-media-server';
import ffmpegPath from 'ffmpeg-static';
import { db } from './db/index.js';
import { users } from './db/schema/users.js';
import { streams } from './db/schema/streams.js';
import { eq, and } from 'drizzle-orm';

const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        mediaroot: './media',
        allow_origin: '*'
    },
    trans: {
        ffmpeg: ffmpegPath,
        tasks: [
            {
                app: 'live',
                hls: true,
                hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
                hlsKeep: false, // false to delete old segments, true to keep them (VOD)
                dash: true,
                dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
            }
        ]
    }
};

const nms = new NodeMediaServer(config);

nms.on('prePublish', async (id, StreamPath, args) => {
    // StreamPath is usually /live/streamKey
    const streamKey = StreamPath.split('/').pop();
    console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

    try {
        // Validate stream key
        const user = await db.query.users.findFirst({
            where: eq(users.streamKey, streamKey)
        });

        if (!user) {
            console.error(`[NodeEvent on prePublish] Invalid stream key: ${streamKey}`);
            const session = nms.getSession(id);
            if (session) session.reject();
            return;
        }

        // Find or create stream record
        const existingStream = await db.query.streams.findFirst({
            where: and(
                eq(streams.userId, user.id),
                eq(streams.status, 'idle')
            )
        });

        if (existingStream) {
            // Update existing idle stream to live
            await db.update(streams)
                .set({
                    status: 'live',
                    startedAt: new Date(),
                    viewerCount: 0,
                    updatedAt: new Date(),
                })
                .where(eq(streams.id, existingStream.id));

            console.log(`[NodeEvent on prePublish] Stream ${existingStream.id} is now live`);
        } else {
            // Create new stream record with default metadata
            await db.insert(streams).values({
                userId: user.id,
                title: `${user.username}'s Stream`,
                status: 'live',
                startedAt: new Date(),
                viewerCount: 0,
            });

            console.log(`[NodeEvent on prePublish] Created new stream for user ${user.id}`);
        }

        // Update user status to live
        await db.update(users)
            .set({ isLive: true })
            .where(eq(users.id, user.id));

        console.log(`[NodeEvent on prePublish] User ${user.username} is now live.`);

    } catch (error) {
        console.error('[NodeEvent on prePublish] Error:', error);
        const session = nms.getSession(id);
        if (session) session.reject();
    }
});

nms.on('donePublish', async (id, StreamPath, args) => {
    const streamKey = StreamPath.split('/').pop();
    console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);

    try {
        // Find user by stream key
        const user = await db.query.users.findFirst({
            where: eq(users.streamKey, streamKey)
        });

        if (!user) {
            console.error(`[NodeEvent on donePublish] User not found for stream key: ${streamKey}`);
            return;
        }

        // Find active stream
        const activeStream = await db.query.streams.findFirst({
            where: and(
                eq(streams.userId, user.id),
                eq(streams.status, 'live')
            ),
            orderBy: (streams, { desc }) => [desc(streams.startedAt)]
        });

        if (activeStream) {
            // Calculate duration
            const duration = activeStream.startedAt
                ? Math.floor((new Date() - new Date(activeStream.startedAt)) / 1000)
                : 0;

            // Update stream status to ended
            await db.update(streams)
                .set({
                    status: 'ended',
                    endedAt: new Date(),
                    duration,
                    viewerCount: 0, // Reset viewer count
                    updatedAt: new Date(),
                })
                .where(eq(streams.id, activeStream.id));

            console.log(`[NodeEvent on donePublish] Stream ${activeStream.id} ended. Duration: ${duration}s, Peak viewers: ${activeStream.peakViewers || 0}`);
        }

        // Update user status to offline
        await db.update(users)
            .set({ isLive: false })
            .where(eq(users.id, user.id));

        console.log(`[NodeEvent on donePublish] User ${user.username} is now offline.`);
    } catch (error) {
        console.error('[NodeEvent on donePublish] Error:', error);
    }
});

export default nms;

