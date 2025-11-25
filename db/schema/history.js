import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { videos } from './videos.js';

export const history = pgTable('history', {
    userId: integer('user_id').references(() => users.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    watchedAt: timestamp('watched_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.videoId] }),
}));
