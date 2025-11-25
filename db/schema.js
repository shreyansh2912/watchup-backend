import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    avatar: text('avatar'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const videos = pgTable('videos', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    userId: serial('user_id').references(() => users.id),
    views: serial('views').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});
