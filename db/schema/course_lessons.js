import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';
import { courseModules } from './course_modules.js';
import { videos } from './videos.js';

export const courseLessons = pgTable('course_lessons', {
    id: serial('id').primaryKey(),
    moduleId: integer('module_id').references(() => courseModules.id).notNull(),
    videoId: integer('video_id').references(() => videos.id), // Optional, can be text lesson
    title: text('title').notNull(),
    content: text('content'), // For text-based lessons
    order: integer('order').notNull(),
    isFreePreview: boolean('is_free_preview').default(false),
});
