import express from 'express';
import { createCourse, getCourse, updateCourse, listCourses, addModule, addLesson, checkEnrollment } from '../controllers/courseController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', listCourses);
router.get('/:id', getCourse);
router.get('/:courseId/enrollment', verifyToken, checkEnrollment);

router.post('/', verifyToken, upload.single('thumbnail'), createCourse);
router.put('/:id', verifyToken, upload.single('thumbnail'), updateCourse);

router.post('/:courseId/modules', verifyToken, addModule);
router.post('/modules/:moduleId/lessons', verifyToken, addLesson);

export default router;
