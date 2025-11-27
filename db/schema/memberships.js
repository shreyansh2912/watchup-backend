import { pgTable, serial, text, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';

export const memberships = pgTable('memberships', {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    price: numeric('price').notNull(), // Using numeric for currency
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
