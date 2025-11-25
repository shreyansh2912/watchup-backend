import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { channels } from './channels.js';
import { videos } from './videos.js';
import { comments } from './comments.js';
import { likes } from './likes.js';
import { subscriptions } from './subscriptions.js';

export const usersRelations = relations(users, ({ one, many }) => ({
    channel: one(channels),
    comments: many(comments),
    likes: many(likes),
    subscriptions: many(subscriptions),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
    user: one(users, {
        fields: [channels.userId],
        references: [users.id],
    }),
    videos: many(videos),
    subscribers: many(subscriptions),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
    channel: one(channels, {
        fields: [videos.channelId],
        references: [channels.id],
    }),
    comments: many(comments),
    likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
    video: one(videos, {
        fields: [comments.videoId],
        references: [videos.id],
    }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
    user: one(users, {
        fields: [likes.userId],
        references: [users.id],
    }),
    video: one(videos, {
        fields: [likes.videoId],
        references: [videos.id],
    }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    subscriber: one(users, {
        fields: [subscriptions.subscriberId],
        references: [users.id],
    }),
    channel: one(channels, {
        fields: [subscriptions.channelId],
        references: [channels.id],
    }),
}));
