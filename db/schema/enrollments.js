import { pgTable, serial, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { courses } from './courses.js';

export const enrollments = pgTable('enrollments', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    courseId: integer('course_id').references(() => courses.id).notNull(),
    paymentId: text('payment_id'), // Stripe/Razorpay ID
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').default('INR'),
    status: text('status').default('pending'), // pending, completed, failed
    createdAt: timestamp('created_at').defaultNow(),
});
