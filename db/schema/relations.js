import { relations } from 'drizzle-orm';
import { users } from './users.js';
import { channels } from './channels.js';
import { videos } from './videos.js';
import { comments } from './comments.js';
import { likes } from './likes.js';
import { subscriptions } from './subscriptions.js';
import { playlists, playlistVideos } from './playlists.js';
import { history } from './history.js';
import { reports } from './reports.js';
import { notifications } from './notifications.js';
import { courses } from './courses.js';
import { courseModules } from './course_modules.js';
import { courseLessons } from './course_lessons.js';
import { enrollments } from './enrollments.js';
import { streams } from './streams.js';

export const usersRelations = relations(users, ({ many }) => ({
    channels: many(channels),
    enrollments: many(enrollments),
    streams: many(streams),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
    user: one(users, {
        fields: [channels.userId],
        references: [users.id],
    }),
    videos: many(videos),
    comments: many(comments),
    likes: many(likes),
    subscriptions: many(subscriptions, { relationName: 'channelSubscriptions' }),
    subscribers: many(subscriptions, { relationName: 'channelSubscribers' }),
    playlists: many(playlists),
    history: many(history),
    receivedNotifications: many(notifications, { relationName: 'receivedNotifications' }),
    sentNotifications: many(notifications, { relationName: 'sentNotifications' }),
    courses: many(courses),
    streams: many(streams),
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
    channel: one(channels, {
        fields: [comments.channelId],
        references: [channels.id],
    }),
    video: one(videos, {
        fields: [comments.videoId],
        references: [videos.id],
    }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
    channel: one(channels, {
        fields: [likes.channelId],
        references: [channels.id],
    }),
    video: one(videos, {
        fields: [likes.videoId],
        references: [videos.id],
    }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
    subscriber: one(channels, {
        fields: [subscriptions.subscriberChannelId],
        references: [channels.id],
        relationName: 'channelSubscriptions',
    }),
    channel: one(channels, {
        fields: [subscriptions.channelId],
        references: [channels.id],
        relationName: 'channelSubscribers',
    }),
}));


export const playlistsRelations = relations(playlists, ({ one, many }) => ({
    channel: one(channels, {
        fields: [playlists.channelId],
        references: [channels.id],
    }),
    videos: many(playlistVideos),
}));

export const playlistVideosRelations = relations(playlistVideos, ({ one }) => ({
    playlist: one(playlists, {
        fields: [playlistVideos.playlistId],
        references: [playlists.id],
    }),
    video: one(videos, {
        fields: [playlistVideos.videoId],
        references: [videos.id],
    }),
}));

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

export const historyRelations = relations(history, ({ one }) => ({
    channel: one(channels, {
        fields: [history.channelId],
        references: [channels.id],
    }),
    video: one(videos, {
        fields: [history.videoId],
        references: [videos.id],
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    recipient: one(channels, {
        fields: [notifications.recipientChannelId],
        references: [channels.id],
        relationName: 'receivedNotifications'
    }),
    sender: one(channels, {
        fields: [notifications.senderChannelId],
        references: [channels.id],
        relationName: 'sentNotifications'
    }),
    video: one(videos, {
        fields: [notifications.videoId],
        references: [videos.id]
    })
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
    channel: one(channels, {
        fields: [courses.channelId],
        references: [channels.id],
    }),
    modules: many(courseModules),
    enrollments: many(enrollments),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
    course: one(courses, {
        fields: [courseModules.courseId],
        references: [courses.id],
    }),
    lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ one }) => ({
    module: one(courseModules, {
        fields: [courseLessons.moduleId],
        references: [courseModules.id],
    }),
    video: one(videos, {
        fields: [courseLessons.videoId],
        references: [videos.id],
    }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    user: one(users, {
        fields: [enrollments.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [enrollments.courseId],
        references: [courses.id],
    }),
}));

export const streamsRelations = relations(streams, ({ one }) => ({
    user: one(users, {
        fields: [streams.userId],
        references: [users.id],
    }),
    channel: one(channels, {
        fields: [streams.channelId],
        references: [channels.id],
    }),
}));

