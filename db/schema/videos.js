import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';

export const videos = pgTable('videos', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    views: integer('views').default(0),
    duration: integer('duration').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (t) => ({
    titleIdx: index('title_idx').on(t.title),
}));
