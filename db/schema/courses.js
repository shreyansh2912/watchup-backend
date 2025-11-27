import { pgTable, serial, text, timestamp, integer, boolean, decimal } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';

export const courses = pgTable('courses', {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    slug: text('slug').unique(),
    price: decimal('price', { precision: 10, scale: 2 }).default('0'),
    thumbnailUrl: text('thumbnail_url'),
    isPublished: boolean('is_published').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
