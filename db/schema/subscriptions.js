import { pgTable, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';

export const subscriptions = pgTable('subscriptions', {
    subscriberChannelId: integer('subscriber_channel_id').references(() => channels.id).notNull(),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.subscriberChannelId, t.channelId] }),
}));
