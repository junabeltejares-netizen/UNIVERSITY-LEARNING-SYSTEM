const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    const { username, password, email, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, role || 'student']
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username, email, role, created_at FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
