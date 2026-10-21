const express = require('express');
const { authenticate, requireRole, loadOwnStudent } = require('../middleware/auth');
const { assignmentUpload, submissionUpload } = require('../middleware/upload');

const auth = require('../controllers/authController');
const students = require('../controllers/studentsController');
const attendance = require('../controllers/attendanceController');
const assignments = require('../controllers/assignmentsController');
const submissions = require('../controllers/submissionsController');
const dashboard = require('../controllers/dashboardController');

const router = express.Router();
const admin = [authenticate, requireRole('admin')];
const student = [authenticate, requireRole('student'), loadOwnStudent];
// admin OR student; for students the own profile is loaded
const anyUser = [authenticate, (req, res, next) => (req.user.role === 'student' ? loadOwnStudent(req, res, next) : next())];

// ---- authentication
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);

// ---- shared dropdown data
router.get('/meta', authenticate, students.meta);

// ---- dashboards
router.get('/dashboard/admin', admin, dashboard.admin);
router.get('/dashboard/student', student, dashboard.student);

// ---- students
router.get('/students', admin, students.list);
router.post('/students', admin, students.create);
router.get('/students/me', student, students.me);          // keep before "/students/:id"
router.delete('/students/:id', admin, students.remove);

// ---- attendance (admin)
router.get('/attendance/roster', admin, attendance.roster);
router.get('/attendance/summary', admin, attendance.summary);
router.post('/attendance', admin, attendance.save);
router.put('/attendance/:id', admin, attendance.update);
// ---- attendance (student, own records only)
router.get('/attendance/me/today', student, attendance.myToday);
router.get('/attendance/me/subjects', student, attendance.mySubjects);
router.get('/attendance/me', student, attendance.myHistory);

// ---- assignments
router.get('/assignments', anyUser, assignments.list);
router.post('/assignments', admin, assignmentUpload, assignments.create);
router.get('/assignments/:id/file', anyUser, assignments.file);
router.delete('/assignments/:id', admin, assignments.remove);

// ---- submissions
router.post('/assignments/:id/submissions', student, submissionUpload, submissions.create);
router.get('/submissions', anyUser, submissions.list);
router.get('/submissions/:id/file', anyUser, submissions.file);

module.exports = router;
