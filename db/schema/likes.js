import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';
import { likeTypeEnum } from './enums.js';

export const likes = pgTable('likes', {
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    type: likeTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.videoId] }),
}));
