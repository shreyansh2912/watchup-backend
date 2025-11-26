import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';

export const notificationTypeEnum = pgEnum('notification_type', ['VIDEO_UPLOAD', 'SUBSCRIBE', 'COMMENT', 'LIKE']);

export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    recipientChannelId: integer('recipient_channel_id').references(() => channels.id).notNull(),
    senderChannelId: integer('sender_channel_id').references(() => channels.id).notNull(),
    type: text('type').notNull(), // Using text instead of enum for flexibility/simplicity with SQLite/Postgres differences if any, but enum is fine. Let's stick to text for now to avoid enum migration complexities if not needed.
    videoId: integer('video_id').references(() => videos.id),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});
