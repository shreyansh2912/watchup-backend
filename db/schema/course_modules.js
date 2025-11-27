import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { courses } from './courses.js';

export const courseModules = pgTable('course_modules', {
    id: serial('id').primaryKey(),
    courseId: integer('course_id').references(() => courses.id).notNull(),
    title: text('title').notNull(),
    order: integer('order').notNull(),
});
