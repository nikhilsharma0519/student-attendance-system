const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const store = require('../utils/jsonStore');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { validateStudentInput, assertValid, str } = require('../utils/validators');
const { safeResolve } = require('../middleware/upload');

const sortStudents = (a, b) =>
  a.className.localeCompare(b.className) || a.section.localeCompare(b.section) || a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });

// GET /api/students?search=&className=&section=      (admin)
exports.list = asyncHandler(async (req, res) => {
  const search = str(req.query.search).toLowerCase();
  const className = str(req.query.className).toUpperCase();
  const section = str(req.query.section).toUpperCase();
  let students = await store.read('students');
  if (className) students = students.filter((s) => s.className === className);
  if (section) students = students.filter((s) => s.section === section);
  if (search) students = students.filter((s) => s.name.toLowerCase().includes(search) || s.rollNo.toLowerCase().includes(search));
  res.json({ students: students.sort(sortStudents) });
});

// A random temporary password such as "Kd7mQx2pLz" shown once to the admin
function temporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[crypto.randomInt(chars.length)];
  return out;
}

// POST /api/students     (admin)
exports.create = asyncHandler(async (req, res) => {
  const { errors, value } = validateStudentInput(req.body || {});
  assertValid(errors);
  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const student = await store.transaction(['students', 'users'], async (db) => {
    const dupErrors = {};
    if (db.students.some((s) => s.rollNo === value.rollNo)) dupErrors.rollNo = 'This roll number already exists';
    if (db.students.some((s) => s.email === value.email) || db.users.some((u) => u.email.toLowerCase() === value.email)) {
      dupErrors.email = 'This email address is already registered';
    }
    const username = value.rollNo.toLowerCase();
    if (db.users.some((u) => (u.username || '').toLowerCase() === username)) dupErrors.rollNo = 'A login with this roll number already exists';
    if (Object.keys(dupErrors).length) throw new HttpError(409, 'Duplicate student', dupErrors);

    const now = new Date().toISOString();
    const id = store.newId('student');
    const record = { id, ...value, createdAt: now };
    db.students.push(record);
    db.users.push({
      id: store.newId('user'), email: value.email, username, passwordHash,
      role: 'student', studentId: id, status: 'active', createdAt: now,
    });
    return record;
  });

  res.status(201).json({ student, temporaryPassword: password, message: 'Student added successfully' });
});

/*
 * DELETE /api/students/:id     (admin)
 * Policy for related records (also documented in README):
 *  - student record      -> removed
 *  - login account       -> removed (the email/roll number can be reused)
 *  - attendance records  -> KEPT for reporting, marked studentDeleted:true with a name snapshot.
 *                           Class-level summaries ignore them.
 *  - submissions         -> removed together with their uploaded files (private student files)
 */
exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const removedSubmissions = await store.transaction(['students', 'users', 'attendance', 'submissions'], async (db) => {
    const student = db.students.find((s) => s.id === id);
    if (!student) throw new HttpError(404, 'Student not found');

    db.students = db.students.filter((s) => s.id !== id);
    db.users = db.users.filter((u) => u.studentId !== id);
    for (const rec of db.attendance) {
      if (rec.studentId === id) { rec.studentDeleted = true; rec.studentName = student.name; }
    }
    const gone = db.submissions.filter((s) => s.studentId === id);
    db.submissions = db.submissions.filter((s) => s.studentId !== id);
    return gone;
  });
  // Files are deleted only after the JSON change was saved successfully
  for (const sub of removedSubmissions) {
    await store.removeFileQuietly(safeResolve(config.paths.submissionUploads, sub.storedName));
  }
  res.json({ message: 'Student deleted successfully' });
});

// GET /api/students/me     (student - always the logged-in account's own profile)
exports.me = (req, res) => {
  const { id, name, rollNo, email, className, section } = req.student;
  res.json({ student: { id, name, rollNo, email, className, section } });
};

// GET /api/meta     (any logged-in user) - dropdown data
exports.meta = asyncHandler(async (req, res) => {
  let classes = [];
  if (req.user.role === 'admin') {
    const students = await store.read('students');
    const map = new Map();
    for (const s of students) {
      if (!map.has(s.className)) map.set(s.className, new Set());
      map.get(s.className).add(s.section);
    }
    classes = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([className, set]) => ({ className, sections: [...set].sort() }));
  }
  res.json({
    subjects: config.subjects,
    statuses: config.statuses,
    classes,
    leaveCountsAsEligible: config.leaveCountsAsEligible,
    maxUploadMb: Math.round(config.maxUploadBytes / 1024 / 1024),
  });
});
