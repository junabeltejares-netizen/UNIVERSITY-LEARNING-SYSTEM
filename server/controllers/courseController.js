const db = require('../config/db');

exports.getAllCourses = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCoursesByInstructor = async (req, res) => {
    const { instructor_id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id
            WHERE c.instructor_id = ?
        `, [instructor_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEnrolledCourses = async (req, res) => {
    const { student_id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id
            JOIN enrollments e ON c.id = e.course_id
            WHERE e.student_id = ?
        `, [student_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCourseById = async (req, res) => {
    const { id } = req.params;
    const student_id = req.query.student_id;
    try {
        const [rows] = await db.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id
            WHERE c.id = ?
        `, [id]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Course not found' });

        const [modules] = await db.query('SELECT * FROM modules WHERE course_id = ? ORDER BY display_order', [id]);
        const course = rows[0];
        course.modules = modules;

        for (let module of course.modules) {
            const [lessons] = await db.query('SELECT * FROM lessons WHERE module_id = ? ORDER BY display_order', [module.id]);
            
            // If student_id is provided, check progress for each lesson
            if (student_id) {
                for (let lesson of lessons) {
                    const [progress] = await db.query('SELECT * FROM progress WHERE student_id = ? AND lesson_id = ?', [student_id, lesson.id]);
                    lesson.is_completed = progress.length > 0;
                }
            }
            module.lessons = lessons;
        }

        res.json(course);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCourse = async (req, res) => {
    const { title, description, instructor_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO courses (title, description, instructor_id) VALUES (?, ?, ?)',
            [title, description, instructor_id]
        );
        res.status(201).json({ message: 'Course created successfully', courseId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCourse = async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        await db.query('UPDATE courses SET title = ?, description = ? WHERE id = ?', [title, description, id]);
        res.json({ message: 'Course updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.enrollInCourse = async (req, res) => {
    const { student_id, course_id } = req.body;
    try {
        await db.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [student_id, course_id]);
        res.status(201).json({ message: 'Enrolled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEnrolledStudents = async (req, res) => {
    const { course_id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT u.id, u.username, u.email 
            FROM users u 
            JOIN enrollments e ON u.id = e.student_id 
            WHERE e.course_id = ?
        `, [course_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addModule = async (req, res) => {
    const { course_id, title, display_order } = req.body;
    try {
        await db.query('INSERT INTO modules (course_id, title, display_order) VALUES (?, ?, ?)', [course_id, title, display_order || 0]);
        res.status(201).json({ message: 'Module added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateModule = async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        await db.query('UPDATE modules SET title = ? WHERE id = ?', [title, id]);
        res.json({ message: 'Module updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addLesson = async (req, res) => {
    const { module_id, title, content, display_order } = req.body;
    try {
        await db.query('INSERT INTO lessons (module_id, title, content, display_order) VALUES (?, ?, ?, ?)', [module_id, title, content, display_order || 0]);
        res.status(201).json({ message: 'Lesson added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markLessonComplete = async (req, res) => {
    const { student_id, lesson_id } = req.body;
    try {
        await db.query('INSERT INTO progress (student_id, lesson_id) VALUES (?, ?)', [student_id, lesson_id]);
        res.status(201).json({ message: 'Progress saved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCourse = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteModule = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM modules WHERE id = ?', [id]);
        res.json({ message: 'Module deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteLesson = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM lessons WHERE id = ?', [id]);
        res.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
