import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';

export const history = pgTable('history', {
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    watchedAt: timestamp('watched_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.videoId] }),
}));
