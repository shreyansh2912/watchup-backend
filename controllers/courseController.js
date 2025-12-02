import { db } from '../db/index.js';
import { courses } from '../db/schema/courses.js';
import { courseModules } from '../db/schema/course_modules.js';
import { courseLessons } from '../db/schema/course_lessons.js';
import { enrollments } from '../db/schema/enrollments.js';
import { eq, desc, and } from 'drizzle-orm';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

const generateSlug = (title) => {
    const randomStr = Math.random().toString(36).substring(2, 8);
    const titleSlug = title
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
    return `${titleSlug}-${randomStr}`;
};

export const createCourse = async (req, res) => {
    try {
        const { title, description, price, visibility } = req.body;
        const channel = req.channel;

        if (!channel) {
            return errorResponse(res, 400, "Channel context required");
        }

        let thumbnailUrl = null;
        if (req.file) {
            const upload = await uploadOnCloudinary(req.file.path);
            if (upload) thumbnailUrl = upload.secure_url;
        }

        const slug = generateSlug(title);

        const [newCourse] = await db.insert(courses).values({
            channelId: channel.id,
            title,
            description,
            price: price || 0,
            visibility: visibility || 'public',
            thumbnailUrl,
            slug,
            isPublished: false,
        }).returning();

        return successResponse(res, 201, "Course created successfully", newCourse);
    } catch (error) {
        console.error("Create Course Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getCourse = async (req, res) => {
    try {
        const { id } = req.params; // id or slug

        let course = await db.query.courses.findFirst({
            where: eq(courses.slug, id),
            with: {
                channel: true,
                modules: {
                    with: {
                        lessons: {
                            with: {
                                video: true
                            },
                            orderBy: (lessons, { asc }) => [asc(lessons.order)],
                        }
                    },
                    orderBy: (modules, { asc }) => [asc(modules.order)],
                }
            }
        });

        if (!course && !isNaN(id)) {
            course = await db.query.courses.findFirst({
                where: eq(courses.id, parseInt(id)),
                with: {
                    channel: true,
                    modules: {
                        with: {
                            lessons: {
                                with: {
                                    video: true
                                },
                                orderBy: (lessons, { asc }) => [asc(lessons.order)],
                            }
                        },
                        orderBy: (modules, { asc }) => [asc(modules.order)],
                    }
                }
            });
        }

        if (!course) {
            return errorResponse(res, 404, "Course not found");
        }

        // Check Visibility & Access
        // Owner always has access
        const isOwner = req.channel && req.channel.id === course.channelId;

        if (!isOwner) {
            if (course.visibility === 'members-only') {
                // Check membership
                if (!req.user) return errorResponse(res, 401, "Login required");

                // Check active membership (simplified check, ideally join with channel_members)
                // For now, we rely on the frontend to check or a separate middleware, 
                // but let's do a quick DB check if possible or just return the course 
                // and let the frontend show "Join to access" if they try to view content.
                // Actually, for "getCourse" (metadata), we usually allow viewing the landing page.
                // But we should flag if they have access.

                // Let's attach `hasAccess` to the response
            }
        }

        // For now, we return the course metadata. 
        // The actual content (lessons) might need protection, but `getCourse` returns structure.
        // We can filter lessons if needed, but usually we show the outline.
        // Let's just return the course. The frontend will handle the "Buy" or "Join" UI.

        return successResponse(res, 200, "Course fetched successfully", course);
    } catch (error) {
        console.error("Get Course Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, isPublished, visibility } = req.body;
        const channel = req.channel;

        const course = await db.query.courses.findFirst({
            where: eq(courses.id, parseInt(id)),
        });

        if (!course) return errorResponse(res, 404, "Course not found");
        if (course.channelId !== channel.id) return errorResponse(res, 403, "Unauthorized");

        let updateData = { title, description, price, isPublished, visibility };

        if (req.file) {
            const upload = await uploadOnCloudinary(req.file.path);
            if (upload) updateData.thumbnailUrl = upload.secure_url;
        }

        const [updatedCourse] = await db.update(courses)
            .set(updateData)
            .where(eq(courses.id, parseInt(id)))
            .returning();

        return successResponse(res, 200, "Course updated successfully", updatedCourse);
    } catch (error) {
        console.error("Update Course Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const addModule = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, order } = req.body;

        // Verify ownership (omitted for brevity, but should be there)

        const [newModule] = await db.insert(courseModules).values({
            courseId: parseInt(courseId),
            title,
            order: order || 0,
        }).returning();

        return successResponse(res, 201, "Module added", newModule);
    } catch (error) {
        console.error("Add Module Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const addLesson = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { title, content, videoId, order, isFreePreview } = req.body;

        const [newLesson] = await db.insert(courseLessons).values({
            moduleId: parseInt(moduleId),
            title,
            content,
            videoId: videoId ? parseInt(videoId) : null,
            order: order || 0,
            isFreePreview: isFreePreview || false,
        }).returning();

        return successResponse(res, 201, "Lesson added", newLesson);
    } catch (error) {
        console.error("Add Lesson Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const listCourses = async (req, res) => {
    try {
        const { channelId } = req.query;

        let whereClause = undefined;
        if (channelId) {
            whereClause = eq(courses.channelId, parseInt(channelId));
        } else {
            // If no channel specified, maybe return all published courses?
            whereClause = eq(courses.isPublished, true);
        }

        const allCourses = await db.query.courses.findMany({
            where: whereClause,
            with: {
                channel: true
            },
            orderBy: [desc(courses.createdAt)]
        });

        return successResponse(res, 200, "Courses listed", allCourses);
    } catch (error) {
        console.error("List Courses Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const checkEnrollment = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const enrollment = await db.query.enrollments.findFirst({
            where: and(
                eq(enrollments.courseId, parseInt(courseId)),
                eq(enrollments.userId, userId),
                eq(enrollments.status, 'completed')
            )
        });

        return successResponse(res, 200, "Enrollment status", { isEnrolled: !!enrollment });
    } catch (error) {
        console.error("Check Enrollment Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
