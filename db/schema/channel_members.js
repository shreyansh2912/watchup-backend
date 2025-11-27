import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { memberships } from './memberships.js';

export const channelMembers = pgTable('channel_members', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    membershipId: integer('membership_id').references(() => memberships.id).notNull(),
    status: text('status').default('active'), // active, expired, cancelled
    startDate: timestamp('start_date').defaultNow(),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
