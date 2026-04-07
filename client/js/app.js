import { api } from './api.js';

const app = document.getElementById('app');
const modalContainer = document.getElementById('modal-container');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');

let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    attachEventListeners();
    window.showHome();
});

function updateNav() {
    const authLinks = document.getElementById('auth-links');
    if (currentUser) {
        authLinks.innerHTML = `
            <span class="welcome-text">Welcome, <strong>${currentUser.username}</strong> (${currentUser.role})</span>
            <a href="#" id="dashboard-link" class="nav-item">Dashboard</a>
            ${currentUser.role === 'instructor' ? '<button id="create-course-btn" class="cta-btn secondary small">Create Course</button>' : ''}
            <button id="logout-btn" class="logout-btn">Logout</button>
        `;
    } else {
        authLinks.innerHTML = `
            <button id="login-btn">Login</button>
            <button id="register-btn" class="cta-btn">Register</button>
        `;
    }
}

function attachEventListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.id === 'home-link') {
            e.preventDefault();
            window.showHome();
        }
        if (e.target.id === 'courses-link' || e.target.id === 'browse-courses-btn' || e.target.id === 'browse-courses-btn-home') {
            e.preventDefault();
            window.showCourses();
        }
        if (e.target.id === 'dashboard-link') {
            e.preventDefault();
            if (currentUser.role === 'instructor') window.showInstructorDashboard();
            else window.showStudentDashboard();
        }
        if (e.target.id === 'login-btn') window.showLoginForm();
        if (e.target.id === 'register-btn') window.showRegisterForm();
        if (e.target.id === 'logout-btn') logout();
        if (e.target.id === 'create-course-btn') window.showCreateCourseForm();
    });

    closeBtn.onclick = () => modalContainer.style.display = "none";
    window.onclick = (e) => { if (e.target == modalContainer) modalContainer.style.display = "none"; };
}

window.showHome = () => {
    if (currentUser) {
        if (currentUser.role === 'instructor') return window.showInstructorDashboard();
        return window.showStudentDashboard();
    }
    app.innerHTML = `
        <section class="hero">
            <h1>Welcome to University Learning System</h1>
            <p>Empowering students and instructors with a modern learning experience.</p>
            <button class="cta-btn" id="browse-courses-btn-home">Browse Courses</button>
        </section>
    `;
};

window.showStudentDashboard = async () => {
    try {
        const enrolled = await api.get(`/courses/student/${currentUser.id}`);
        app.innerHTML = `
            <div class="dashboard">
                <h2>Student Dashboard</h2>
                <div class="stats-bar">
                    <div class="stat-card">
                        <h3>${enrolled.length}</h3>
                        <p>Enrolled Courses</p>
                    </div>
                </div>
                <hr>
                <h3>My Enrolled Courses</h3>
                <div class="course-grid">
                    ${enrolled.length > 0 ? enrolled.map(course => `
                        <div class="course-card">
                            <h3>${course.title}</h3>
                            <p>${course.description}</p>
                            <button class="cta-btn" onclick="showCourseDetails(${course.id})">Continue Learning</button>
                        </div>
                    `).join('') : '<p>You are not enrolled in any courses yet. <a href="#" onclick="showCourses()">Browse Courses</a></p>'}
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
    }
};

window.showInstructorDashboard = async () => {
    try {
        const created = await api.get(`/courses/instructor/${currentUser.id}`);
        app.innerHTML = `
            <div class="dashboard">
                <h2>Instructor Dashboard</h2>
                <div class="stats-bar">
                    <div class="stat-card">
                        <h3>${created.length}</h3>
                        <p>Total Courses</p>
                    </div>
                </div>
                <hr>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>My Created Courses</h3>
                    <button class="cta-btn" onclick="showCreateCourseForm()">+ New Course</button>
                </div>
                <div class="course-grid">
                    ${created.length > 0 ? created.map(course => `
                        <div class="course-card">
                            <h3>${course.title}</h3>
                            <p>${course.description}</p>
                            <div class="card-actions">
                                <button class="cta-btn" onclick="showManageCourse(${course.id})">Manage</button>
                                <button class="cta-btn secondary" onclick="showEditCourseForm(${course.id})">Edit</button>
                            </div>
                        </div>
                    `).join('') : '<p>You haven\'t created any courses yet.</p>'}
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
    }
};

window.showCourses = async () => {
    try {
        const courses = await api.get('/courses');
        app.innerHTML = `
            <h2>Available Courses</h2>
            <div class="course-grid">
                ${courses.map(course => `
                    <div class="course-card">
                        <h3>${course.title}</h3>
                        <p>${course.description}</p>
                        <p><strong>Instructor:</strong> ${course.instructor_name}</p>
                        <div class="card-actions">
                            <button class="cta-btn" onclick="showCourseDetails(${course.id})">View Details</button>
                            ${currentUser?.role === 'student' ? `<button class="cta-btn secondary" onclick="enroll(${course.id})">Enroll Now</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<p>Error loading courses: ${error.message}</p>`;
    }
};

window.showCourseDetails = async (courseId) => {
    try {
        let enrolled = false;
        if (currentUser) {
            const endpoint = currentUser.role === 'instructor' ? `/courses/instructor/${currentUser.id}` : `/courses/student/${currentUser.id}`;
            const myCourses = await api.get(endpoint);
            enrolled = myCourses.some(c => c.id == courseId);
        }

        const url = currentUser ? `/courses/${courseId}?student_id=${currentUser.id}` : `/courses/${courseId}`;
        const course = await api.get(url);

        app.innerHTML = `
            <div class="course-detail">
                <button class="back-btn" onclick="showCourses()">← Back to Courses</button>
                <h2>${course.title}</h2>
                <p class="description">${course.description}</p>
                <p><strong>Instructor:</strong> ${course.instructor_name}</p>
                <hr>
                <h3>Course Content</h3>
                ${!enrolled && currentUser?.role === 'student' ? `
                    <div class="lock-overlay">
                        <p>Enroll in this course to access the modules and lessons.</p>
                        <button class="cta-btn" onclick="enroll(${course.id})">Enroll Now</button>
                    </div>
                ` : `
                    <div class="module-list">
                        ${course.modules.length > 0 ? course.modules.map(module => `
                            <div class="module-item">
                                <h4>${module.title}</h4>
                                <ul>
                                    ${module.lessons.map(lesson => `
                                        <li class="lesson-item ${lesson.is_completed ? 'completed' : ''}">
                                            <div class="lesson-header">
                                                <strong>${lesson.title}</strong>
                                                ${currentUser?.role === 'student' ? `
                                                    <button class="progress-btn" onclick="markComplete(${lesson.id}, ${course.id})" ${lesson.is_completed ? 'disabled' : ''}>
                                                        ${lesson.is_completed ? '✓ Completed' : 'Mark as Done'}
                                                    </button>
                                                ` : ''}
                                            </div>
                                            <p>${lesson.content}</p>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        `).join('') : '<p>No content available yet.</p>'}
                    </div>
                `}
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<p>Error: ${error.message}</p>`;
    }
};

window.markComplete = async (lessonId, courseId) => {
    try {
        await api.post('/courses/progress', { student_id: currentUser.id, lesson_id: lessonId });
        window.showCourseDetails(courseId);
    } catch (error) {
        alert('Failed to save progress');
    }
};

window.showManageCourse = async (courseId) => {
    try {
        const course = await api.get(`/courses/${courseId}`);
        const students = await api.get(`/courses/${courseId}/students`);
        
        app.innerHTML = `
            <div class="manage-course">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="back-btn" onclick="showInstructorDashboard()">← Back to Dashboard</button>
                    <button class="cta-btn secondary" style="background:#c0392b" onclick="deleteCourse(${course.id})">Delete Course</button>
                </div>
                <h2>Manage Course: ${course.title}</h2>
                
                <div class="manage-sections">
                    <section class="manage-content">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h3>Course Content</h3>
                            <button class="cta-btn" onclick="showAddModuleForm(${course.id})">+ Add Module</button>
                        </div>
                        <div class="module-list">
                            ${course.modules.map(module => `
                                <div class="module-item">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <h4>${module.title}</h4>
                                        <div>
                                            <button class="cta-btn secondary" style="background:#3498db" onclick="showEditModuleForm(${module.id}, '${module.title}', ${course.id})">Edit</button>
                                            <button class="cta-btn secondary" style="background:#e67e22" onclick="deleteModule(${module.id}, ${course.id})">Delete</button>
                                            <button class="cta-btn secondary" onclick="showAddLessonForm(${module.id}, ${course.id})">Add Lesson</button>
                                        </div>
                                    </div>
                                    <ul>
                                        ${module.lessons.map(lesson => `
                                            <li class="manage-lesson-item lesson-item">
                                                <div class="manage-lesson-header lesson-header" onclick="this.parentElement.classList.toggle('active')">
                                                    <div class="lesson-title-group">
                                                        <i class="fas fa-chevron-down toggle-icon"></i>
                                                        <span>${lesson.title}</span>
                                                    </div>
                                                    <button class="cta-btn secondary" style="background:#95a5a6; padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="event.stopPropagation(); deleteLesson(${lesson.id}, ${course.id})">Delete</button>
                                                </div>
                                                <div class="lesson-body">
                                                    <p>${lesson.content}</p>
                                                </div>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    </section>

                    <section class="enrolled-students">
                        <h3>Enrolled Students (${students.length})</h3>
                        <ul class="student-list">
                            ${students.length > 0 ? students.map(student => `
                                <li>
                                    <strong>${student.username}</strong>
                                    <span>${student.email}</span>
                                </li>
                            `).join('') : '<p>No students enrolled yet.</p>'}
                        </ul>
                    </section>
                </div>
            </div>
        `;
    } catch (error) {
        app.innerHTML = `<p>Error: ${error.message}</p>`;
    }
};

window.showEditCourseForm = async (courseId) => {
    try {
        const course = await api.get(`/courses/${courseId}`);
        modalBody.innerHTML = `
            <h3>Edit Course</h3>
            <form id="edit-course-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="edit-course-title" value="${course.title}" required>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="edit-course-description" rows="4" style="width:100%">${course.description}</textarea>
                </div>
                <button type="submit" class="cta-btn">Update Course</button>
            </form>
        `;
        modalContainer.style.display = "block";
        document.getElementById('edit-course-form').onsubmit = async (e) => {
            e.preventDefault();
            const title = document.getElementById('edit-course-title').value;
            const description = document.getElementById('edit-course-description').value;
            try {
                await api.put(`/courses/${courseId}`, { title, description });
                modalContainer.style.display = "none";
                window.showInstructorDashboard();
            } catch (error) {
                alert('Update failed: ' + error.message);
            }
        };
    } catch (error) {
        alert('Error loading course: ' + error.message);
    }
};

window.showEditModuleForm = (moduleId, currentTitle, courseId) => {
    modalBody.innerHTML = `
        <h3>Edit Module</h3>
        <form id="edit-module-form">
            <div class="form-group">
                <label>Module Title</label>
                <input type="text" id="edit-module-title" value="${currentTitle}" required>
            </div>
            <button type="submit" class="cta-btn">Update Module</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('edit-module-form').onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('edit-module-title').value;
        try {
            await api.put(`/courses/modules/${moduleId}`, { title });
            modalContainer.style.display = "none";
            window.showManageCourse(courseId);
        } catch (error) {
            alert('Update failed: ' + error.message);
        }
    };
};

window.deleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
        await api.delete(`/courses/${id}`);
        window.showInstructorDashboard();
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

window.deleteModule = async (id, courseId) => {
    if (!confirm('Delete this module?')) return;
    try {
        await api.delete(`/courses/modules/${id}`);
        window.showManageCourse(courseId);
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

window.deleteLesson = async (id, courseId) => {
    if (!confirm('Delete this lesson?')) return;
    try {
        await api.delete(`/courses/lessons/${id}`);
        window.showManageCourse(courseId);
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
};

window.showCreateCourseForm = () => {
    modalBody.innerHTML = `
        <h3>Create New Course</h3>
        <form id="create-course-form">
            <div class="form-group">
                <label>Course Title</label>
                <input type="text" id="course-title" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="course-description" rows="4" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;" required></textarea>
            </div>
            <button type="submit" class="cta-btn">Create Course</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('create-course-form').onsubmit = handleCreateCourse;
}

async function handleCreateCourse(e) {
    e.preventDefault();
    const title = document.getElementById('course-title').value;
    const description = document.getElementById('course-description').value;
    await api.post('/courses', { title, description, instructor_id: currentUser.id });
    modalContainer.style.display = "none";
    window.showInstructorDashboard();
}

window.showAddModuleForm = (courseId) => {
    modalBody.innerHTML = `
        <h3>Add New Module</h3>
        <form id="add-module-form">
            <div class="form-group">
                <label>Module Title</label>
                <input type="text" id="module-title" required>
            </div>
            <button type="submit" class="cta-btn">Add Module</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('add-module-form').onsubmit = (e) => handleAddModule(e, courseId);
};

async function handleAddModule(e, courseId) {
    e.preventDefault();
    const title = document.getElementById('module-title').value;
    await api.post('/courses/modules', { course_id: courseId, title });
    modalContainer.style.display = "none";
    window.showManageCourse(courseId);
}

window.showAddLessonForm = (moduleId, courseId) => {
    modalBody.innerHTML = `
        <h3>Add New Lesson</h3>
        <form id="add-lesson-form">
            <div class="form-group">
                <label>Lesson Title</label>
                <input type="text" id="lesson-title" required>
            </div>
            <div class="form-group">
                <label>Content</label>
                <textarea id="lesson-content" rows="4" style="width:100%; padding:0.5rem;" required></textarea>
            </div>
            <button type="submit" class="cta-btn">Add Lesson</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('add-lesson-form').onsubmit = (e) => handleAddLesson(e, moduleId, courseId);
};

async function handleAddLesson(e, moduleId, courseId) {
    e.preventDefault();
    const title = document.getElementById('lesson-title').value;
    const content = document.getElementById('lesson-content').value;
    await api.post('/courses/lessons', { module_id: moduleId, title, content });
    modalContainer.style.display = "none";
    window.showManageCourse(courseId);
}

window.showLoginForm = () => {
    modalBody.innerHTML = `
        <h3>Login</h3>
        <form id="login-form">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="login-username" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="login-password" required>
            </div>
            <button type="submit" class="cta-btn">Login</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('login-form').onsubmit = handleLogin;
};

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
        const data = await api.post('/users/login', { username, password });
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        modalContainer.style.display = "none";
        updateNav();
        window.showHome();
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

window.showRegisterForm = () => {
    modalBody.innerHTML = `
        <h3>Register</h3>
        <form id="register-form">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="reg-username" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="reg-email" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="reg-password" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="reg-role">
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                </select>
            </div>
            <button type="submit" class="cta-btn">Register</button>
        </form>
    `;
    modalContainer.style.display = "block";
    document.getElementById('register-form').onsubmit = handleRegister;
};

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    try {
        await api.post('/users/register', { username, email, password, role });
        alert('Registration successful! Please login.');
        window.showLoginForm();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('user');
    updateNav();
    window.showHome();
}

window.enroll = async (courseId) => {
    if (!currentUser) {
        alert('Please login to enroll in courses.');
        window.showLoginForm();
        return;
    }
    try {
        await api.post('/courses/enroll', { student_id: currentUser.id, course_id: courseId });
        alert('Enrolled successfully!');
        if (currentUser.role === 'student') window.showStudentDashboard();
    } catch (error) {
        alert('Enrollment failed: ' + error.message);
    }
};
