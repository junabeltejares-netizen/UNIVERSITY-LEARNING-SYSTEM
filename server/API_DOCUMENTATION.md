# University Learning System API Documentation

## Base URL
`http://localhost:5000/api`

## Users
### Register
- **URL:** `/users/register`
- **Method:** `POST`
- **Body:** `{ "username": "...", "email": "...", "password": "...", "role": "..." }`

### Login
- **URL:** `/users/login`
- **Method:** `POST`
- **Body:** `{ "username": "...", "password": "..." }`

### Get All Users
- **URL:** `/users`
- **Method:** `GET`

## Courses
### Get All Courses
- **URL:** `/courses`
- **Method:** `GET`

### Get Course by ID
- **URL:** `/courses/:id`
- **Method:** `GET`

### Create Course
- **URL:** `/courses`
- **Method:** `POST`
- **Body:** `{ "title": "...", "description": "...", "instructor_id": ... }`

### Enroll in Course
- **URL:** `/courses/enroll`
- **Method:** `POST`
- **Body:** `{ "student_id": ..., "course_id": ... }`
