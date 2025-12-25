import { pgTable, serial, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const streams = pgTable('streams', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    channelId: integer('channel_id'),

    // Stream metadata
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    category: text('category'), // Gaming, Music, Just Chatting, Education, etc.

    // Stream status
    status: text('status').default('idle'), // 'idle', 'live', 'ended'
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),

    // Analytics
    viewerCount: integer('viewer_count').default(0),
    peakViewers: integer('peak_viewers').default(0),
    totalViews: integer('total_views').default(0),
    duration: integer('duration').default(0), // in seconds

    // Settings
    chatEnabled: boolean('chat_enabled').default(true),
    recordStream: boolean('record_stream').default(true), // Save as VOD
    vodUrl: text('vod_url'), // Cloudinary URL after stream ends

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
