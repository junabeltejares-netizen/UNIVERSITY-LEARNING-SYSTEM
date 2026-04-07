const express = require('express');
const cors = require('cors');
const pool = require('./db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 5000;

// --- User Routes ---
app.post('/api/users/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, password, role]
        );
        res.status(201).json({ message: 'User registered', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, role FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        if (rows.length > 0) {
            res.json({ user: rows[0] });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Course Routes ---
app.get('/api/courses', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.query;
    try {
        const [courses] = await pool.query(`
            SELECT c.*, u.username as instructor_name 
            FROM courses c 
            JOIN users u ON c.instructor_id = u.id 
            WHERE c.id = ?`, [id]);
        
        if (courses.length === 0) return res.status(404).json({ message: 'Course not found' });

        const [modules] = await pool.query('SELECT * FROM modules WHERE course_id = ?', [id]);
        
        for (let mod of modules) {
            const [lessons] = await pool.query(`
                SELECT l.*, 
                (SELECT COUNT(*) FROM progress p WHERE p.lesson_id = l.id AND p.student_id = ?) as is_completed
                FROM lessons l WHERE l.module_id = ?`, [student_id || 0, mod.id]);
            mod.lessons = lessons.map(l => ({ ...l, is_completed: l.is_completed > 0 }));
        }

        res.json({ ...courses[0], modules });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/courses', async (req, res) => {
    const { title, description, instructor_id } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO courses (title, description, instructor_id) VALUES (?, ?, ?)',
            [title, description, instructor_id]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/courses/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        await pool.query('UPDATE courses SET title = ?, description = ? WHERE id = ?', [title, description, id]);
        res.json({ message: 'Course updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/instructor/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM courses WHERE instructor_id = ?', [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/student/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.* FROM courses c 
            JOIN enrollments e ON c.id = e.course_id 
            WHERE e.student_id = ?`, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/:id/students', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.username, u.email FROM users u 
            JOIN enrollments e ON u.id = e.student_id 
            WHERE e.course_id = ?`, [req.params.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Module & Lesson Routes ---
app.post('/api/courses/modules', async (req, res) => {
    const { course_id, title } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO modules (course_id, title) VALUES (?, ?)', [course_id, title]);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/courses/modules/:id', async (req, res) => {
    try {
        await pool.query('UPDATE modules SET title = ? WHERE id = ?', [req.body.title, req.params.id]);
        res.json({ message: 'Module updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/courses/modules/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM modules WHERE id = ?', [req.params.id]);
        res.json({ message: 'Module deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/courses/lessons', upload.single('file'), async (req, res) => {
    const { module_id, title, content } = req.body;
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        const [result] = await pool.query(
            'INSERT INTO lessons (module_id, title, content, file_path) VALUES (?, ?, ?, ?)', 
            [module_id, title, content, file_path]
        );
        res.status(201).json({ id: result.insertId, file_path });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/courses/lessons/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM lessons WHERE id = ?', [req.params.id]);
        res.json({ message: 'Lesson deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Enrollment & Progress ---
app.post('/api/courses/enroll', async (req, res) => {
    const { student_id, course_id } = req.body;
    try {
        await pool.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [student_id, course_id]);
        res.status(201).json({ message: 'Enrolled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/courses/progress', async (req, res) => {
    const { student_id, lesson_id } = req.body;
    try {
        await pool.query('INSERT INTO progress (student_id, lesson_id) VALUES (?, ?)', [student_id, lesson_id]);
        res.status(201).json({ message: 'Progress saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
