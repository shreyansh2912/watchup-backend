import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';

export const comments = pgTable('comments', {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});
