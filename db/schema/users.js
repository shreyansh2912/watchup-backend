import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'), // Make nullable for social login
    avatar: text('avatar'),
    googleId: text('google_id').unique(),
    facebookId: text('facebook_id').unique(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
    streamKey: text('stream_key').unique(),
    isLive: boolean('is_live').default(false),
});
