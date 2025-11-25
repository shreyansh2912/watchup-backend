import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { videos } from './videos.js';
import { likeTypeEnum } from './enums.js';

export const likes = pgTable('likes', {
    userId: integer('user_id').references(() => users.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    type: likeTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.videoId] }),
}));
