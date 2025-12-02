import NodeMediaServer from 'node-media-server';
import ffmpegPath from 'ffmpeg-static';
import { db } from './db/index.js';
import { users } from './db/schema/users.js';
import { eq } from 'drizzle-orm';

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
        // Update user status to offline
        // Note: If multiple sessions use the same key (unlikely if rejected), this might be tricky, 
        // but for now assuming 1-to-1 mapping.
        await db.update(users)
            .set({ isLive: false })
            .where(eq(users.streamKey, streamKey));

        console.log(`[NodeEvent on donePublish] Stream ended for key ${streamKey}`);
    } catch (error) {
        console.error('[NodeEvent on donePublish] Error:', error);
    }
});

export default nms;
