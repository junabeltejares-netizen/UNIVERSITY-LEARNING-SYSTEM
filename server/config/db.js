const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../db.json');

// Initialize mockup DB if not exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({
        users: [],
        courses: [],
        enrollments: [],
        modules: [],
        lessons: [],
        progress: []
    }, null, 2));
}

const pool = {
    async query(sql, params = []) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        const normalizedSql = sql.toLowerCase().replace(/\s+/g, ' ').trim();

        // --- SELECTS ---
        if (normalizedSql.includes('select * from users where username = ?')) {
            const user = data.users.find(u => u.username === params[0]);
            return [user ? [user] : []];
        }

        if (normalizedSql.includes('select id, username, email, role, created_at from users')) {
            return [data.users.map(({password, ...u}) => u)];
        }

        if (normalizedSql.includes('join enrollments e on u.id = e.student_id where e.course_id = ?')) {
            const enrolledUserIds = data.enrollments.filter(e => e.course_id == params[0]).map(e => e.student_id);
            return [data.users.filter(u => enrolledUserIds.includes(u.id)).map(({id, username, email}) => ({id, username, email}))];
        }

        if (normalizedSql.includes('from courses c join users u on c.instructor_id = u.id')) {
            let res = data.courses.map(c => {
                const instructor = data.users.find(u => u.id === c.instructor_id);
                return { ...c, instructor_name: instructor ? instructor.username : 'Unknown' };
            });
            
            if (normalizedSql.includes('where c.id = ?')) res = res.filter(c => c.id == params[0]);
            else if (normalizedSql.includes('where c.instructor_id = ?')) res = res.filter(c => c.instructor_id == params[0]);
            else if (normalizedSql.includes('join enrollments e on c.id = e.course_id where e.student_id = ?')) {
                const ids = data.enrollments.filter(e => e.student_id == params[0]).map(e => e.course_id);
                res = res.filter(c => ids.includes(c.id));
            }
            return [res];
        }

        if (normalizedSql.includes('select * from modules where course_id = ?')) {
            return [data.modules.filter(m => m.course_id == params[0]).sort((a, b) => a.display_order - b.display_order)];
        }

        if (normalizedSql.includes('select * from lessons where module_id = ?')) {
            return [data.lessons.filter(l => l.module_id == params[0]).sort((a, b) => a.display_order - b.display_order)];
        }

        if (normalizedSql.includes('select * from progress where student_id = ? and lesson_id = ?')) {
            return [data.progress.filter(p => p.student_id == params[0] && p.lesson_id == params[1])];
        }

        // --- INSERTS ---
        if (normalizedSql.includes('insert into users')) {
            const [username, password, email, role] = params;
            const newUser = { id: data.users.length + 1, username, password, email, role: role || 'student', created_at: new Date() };
            data.users.push(newUser);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: newUser.id }];
        }

        if (normalizedSql.includes('insert into courses')) {
            const [title, description, instructor_id] = params;
            const newCourse = { id: data.courses.length + 1, title, description, instructor_id: parseInt(instructor_id), created_at: new Date() };
            data.courses.push(newCourse);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: newCourse.id }];
        }

        if (normalizedSql.includes('insert into enrollments')) {
            const [s_id, c_id] = params;
            if (data.enrollments.some(e => e.student_id == s_id && e.course_id == c_id)) return [{ insertId: 0 }];
            const newE = { id: data.enrollments.length + 1, student_id: parseInt(s_id), course_id: parseInt(c_id), enrolled_at: new Date() };
            data.enrollments.push(newE);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: newE.id }];
        }

        if (normalizedSql.includes('insert into modules')) {
            const [c_id, title, order] = params;
            const newM = { id: data.modules.length + 1, course_id: parseInt(c_id), title, display_order: parseInt(order || 0), created_at: new Date() };
            data.modules.push(newM);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: newM.id }];
        }

        if (normalizedSql.includes('insert into lessons')) {
            const [m_id, title, content, order] = params;
            const newL = { id: data.lessons.length + 1, module_id: parseInt(m_id), title, content, display_order: parseInt(order || 0), created_at: new Date() };
            data.lessons.push(newL);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: newL.id }];
        }

        if (normalizedSql.includes('insert into progress')) {
            const [s_id, l_id] = params;
            data.progress.push({ student_id: parseInt(s_id), lesson_id: parseInt(l_id), completed_at: new Date() });
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{ insertId: 1 }];
        }

        // --- UPDATES ---
        if (normalizedSql.includes('update courses set title = ?, description = ? where id = ?')) {
            const [title, desc, id] = params;
            const idx = data.courses.findIndex(c => c.id == id);
            if (idx !== -1) {
                data.courses[idx].title = title;
                data.courses[idx].description = desc;
                fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            }
            return [{}];
        }

        if (normalizedSql.includes('update modules set title = ? where id = ?')) {
            const [title, id] = params;
            const idx = data.modules.findIndex(m => m.id == id);
            if (idx !== -1) {
                data.modules[idx].title = title;
                fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            }
            return [{}];
        }

        // --- DELETES ---
        if (normalizedSql.includes('delete from courses where id = ?')) {
            data.courses = data.courses.filter(c => c.id != params[0]);
            data.enrollments = data.enrollments.filter(e => e.course_id != params[0]);
            data.modules = data.modules.filter(m => m.course_id != params[0]);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{}];
        }

        if (normalizedSql.includes('delete from modules where id = ?')) {
            data.modules = data.modules.filter(m => m.id != params[0]);
            data.lessons = data.lessons.filter(l => l.module_id != params[0]);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{}];
        }

        if (normalizedSql.includes('delete from lessons where id = ?')) {
            data.lessons = data.lessons.filter(l => l.id != params[0]);
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
            return [{}];
        }

        console.log('Unrecognized SQL:', sql);
        return [[]];
    }
};

module.exports = pool;
