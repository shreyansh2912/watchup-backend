import { db } from '../db/index.js';
import { reports, channels } from '../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';
import { successResponse, errorResponse } from '../utils/responseHandler.js';

export const createReport = async (req, res) => {
    try {
        const { videoId, reason, category } = req.body;

        if (!req.channel) {
            return errorResponse(res, 400, "Channel context required");
        }
        const reporterChannelId = req.channel.id;

        if (!videoId || !reason) {
            return errorResponse(res, 400, "Video ID and reason are required");
        }

        const [newReport] = await db.insert(reports).values({
            reporterChannelId,
            videoId: parseInt(videoId),
            reason,
            category: category || 'other',
        }).returning();

        return successResponse(res, 201, "Report submitted successfully", newReport);
    } catch (error) {
        console.error("Create Report Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};

export const getReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        const allReports = await db.query.reports.findMany({
            orderBy: [desc(reports.createdAt)],
            limit: limit,
            offset: offset,
            with: {
                reporter: {
                    columns: {
                        name: true,
                        handle: true
                    }
                },
                video: {
                    columns: {
                        title: true,
                        url: true
                    }
                }
            }
        });

        return successResponse(res, 200, "Reports fetched successfully", allReports);
    } catch (error) {
        console.error("Get Reports Error:", error);
        return errorResponse(res, 500, "Server Error", error.message);
    }
};
