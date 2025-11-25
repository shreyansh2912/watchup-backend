import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { channels } from './channels.js';

export const subscriptions = pgTable('subscriptions', {
    subscriberId: integer('subscriber_id').references(() => users.id).notNull(),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.subscriberId, t.channelId] }),
}));
