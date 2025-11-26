import { pgTable, serial, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const channels = pgTable('channels', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    name: text('name').notNull(),
    handle: text('handle').notNull().unique(),
    description: text('description'),
    bannerUrl: text('banner_url'),
    avatarUrl: text('avatar_url'),
    isVerified: boolean('is_verified').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (t) => ({
    nameIdx: index('name_idx').on(t.name),
}));
