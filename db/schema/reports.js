import { pgTable, serial, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';
import { relations } from 'drizzle-orm';

export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'resolved', 'dismissed']);

export const reports = pgTable('reports', {
    id: serial('id').primaryKey(),
    reporterChannelId: integer('reporter_channel_id').references(() => channels.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    reason: text('reason').notNull(),
    category: text('category').default('other'),
    status: reportStatusEnum('status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
    reporter: one(channels, {
        fields: [reports.reporterChannelId],
        references: [channels.id],
    }),
    video: one(videos, {
        fields: [reports.videoId],
        references: [videos.id],
    }),
}));
