require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);

app.get('/', (req, res) => {
    res.send('University Learning System API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
