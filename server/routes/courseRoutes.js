const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);
router.get('/instructor/:instructor_id', courseController.getCoursesByInstructor);
router.get('/student/:student_id', courseController.getEnrolledCourses);
router.get('/:course_id/students', courseController.getEnrolledStudents);

router.post('/', courseController.createCourse);
router.post('/enroll', courseController.enrollInCourse);
router.post('/modules', courseController.addModule);
router.post('/lessons', courseController.addLesson);
router.post('/progress', courseController.markLessonComplete);

router.put('/:id', courseController.updateCourse);
router.put('/modules/:id', courseController.updateModule);

router.delete('/:id', courseController.deleteCourse);
router.delete('/modules/:id', courseController.deleteModule);
router.delete('/lessons/:id', courseController.deleteLesson);

module.exports = router;
