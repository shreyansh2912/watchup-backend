import { pgTable, serial, text, integer, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { channels } from './channels.js';
import { videos } from './videos.js';

export const playlists = pgTable('playlists', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    channelId: integer('channel_id').references(() => channels.id).notNull(),
    isPrivate: boolean('is_private').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const playlistVideos = pgTable('playlist_videos', {
    playlistId: integer('playlist_id').references(() => playlists.id).notNull(),
    videoId: integer('video_id').references(() => videos.id).notNull(),
    addedAt: timestamp('added_at').defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.playlistId, t.videoId] }),
}));
