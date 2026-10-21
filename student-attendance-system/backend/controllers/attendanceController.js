const store = require('../utils/jsonStore');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { todayIST, isValidDate } = require('../utils/dates');
const { count, bySubject } = require('../utils/stats');
const { str, validateRange } = require('../utils/validators');

// ---- shared checks -----------------------------------------------------------
function checkSession(query) {
  const className = str(query.className).toUpperCase();
  const section = str(query.section).toUpperCase();
  const date = str(query.date);
  const subject = str(query.subject);
  if (!className) throw new HttpError(400, 'Select a class');
  if (!section) throw new HttpError(400, 'Select a section');
  if (!date) throw new HttpError(400, 'Select a date');
  if (!isValidDate(date)) throw new HttpError(400, 'Date is not valid');
  if (date > todayIST()) throw new HttpError(400, 'Attendance cannot be marked for a future date');
  if (!subject) throw new HttpError(400, 'Select a subject');
  if (!config.subjects.includes(subject)) throw new HttpError(400, 'Unknown subject');
  return { className, section, date, subject };
}

const byRoll = (a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });

// ---- ADMIN -------------------------------------------------------------------

// GET /api/attendance/roster?className&section&date&subject
// Students of the class/section + any status already saved for that date and subject
exports.roster = asyncHandler(async (req, res) => {
  const s = checkSession(req.query);
  const [students, attendance] = await Promise.all([store.read('students'), store.read('attendance')]);
  const classStudents = students.filter((x) => x.className === s.className && x.section === s.section).sort(byRoll);
  const existing = new Map(
    attendance.filter((a) => a.date === s.date && a.subject === s.subject).map((a) => [a.studentId, a]),
  );
  res.json({
    ...s,
    students: classStudents.map((st) => ({
      studentId: st.id, rollNo: st.rollNo, name: st.name,
      status: existing.has(st.id) ? existing.get(st.id).status : null,
      recordId: existing.has(st.id) ? existing.get(st.id).id : null,
    })),
  });
});

// POST /api/attendance   body: { className, section, date, subject, records: [{studentId, status}] }
// Saves a whole class at once. Existing records for the same student+date+subject are UPDATED, never duplicated.
exports.save = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const s = checkSession(body);
  const records = body.records;
  if (!Array.isArray(records) || records.length === 0) throw new HttpError(400, 'There are no attendance entries to save');
  if (records.length > 500) throw new HttpError(400, 'Too many entries in one request');

  const seen = new Set();
  for (const r of records) {
    if (!r || typeof r.studentId !== 'string') throw new HttpError(400, 'Every entry needs a studentId');
    if (!config.statuses.includes(r.status)) throw new HttpError(400, `Status must be one of: ${config.statuses.join(', ')}`);
    if (seen.has(r.studentId)) throw new HttpError(400, 'The same student appears twice in the request');
    seen.add(r.studentId);
  }

  const result = await store.transaction(['students', 'attendance'], async (db) => {
    // Class/section membership is checked against students.json, not trusted from the browser
    const members = new Map(db.students.filter((x) => x.className === s.className && x.section === s.section).map((x) => [x.id, x]));
    for (const r of records) {
      if (!members.has(r.studentId)) throw new HttpError(400, 'A selected student does not belong to this class and section');
    }
    const index = new Map(db.attendance.filter((a) => a.date === s.date && a.subject === s.subject).map((a) => [a.studentId, a]));
    const now = new Date().toISOString();
    let created = 0, updated = 0, unchanged = 0;
    for (const r of records) {
      const st = members.get(r.studentId);
      const found = index.get(r.studentId);
      if (found) {
        if (found.status === r.status) { unchanged++; continue; }
        found.status = r.status; found.updatedAt = now; found.markedBy = req.user.id;
        updated++;
      } else {
        db.attendance.push({
          id: store.newId('att'), studentId: st.id, rollNo: st.rollNo, className: st.className, section: st.section,
          date: s.date, subject: s.subject, status: r.status, markedBy: req.user.id, createdAt: now, updatedAt: now,
        });
        created++;
      }
    }
    return { created, updated, unchanged };
  });
  res.json({ ...result, message: 'Attendance saved successfully' });
});

// PUT /api/attendance/:id   body: { status }   - change one record
exports.update = asyncHandler(async (req, res) => {
  const status = req.body && req.body.status;
  if (!config.statuses.includes(status)) throw new HttpError(400, `Status must be one of: ${config.statuses.join(', ')}`);
  const record = await store.transaction(['attendance'], async (db) => {
    const rec = db.attendance.find((a) => a.id === req.params.id);
    if (!rec) throw new HttpError(404, 'Attendance record not found');
    rec.status = status; rec.updatedAt = new Date().toISOString(); rec.markedBy = req.user.id;
    return rec;
  });
  res.json({ record, message: 'Attendance updated' });
});

// GET /api/attendance/summary?className&section&subject&from&to
exports.summary = asyncHandler(async (req, res) => {
  const className = str(req.query.className).toUpperCase();
  const section = str(req.query.section).toUpperCase();
  const subject = str(req.query.subject);
  const { from, to } = validateRange(req.query);
  if (subject && !config.subjects.includes(subject)) throw new HttpError(400, 'Unknown subject');

  const [students, attendance] = await Promise.all([store.read('students'), store.read('attendance')]);
  const scoped = students.filter((s) => (!className || s.className === className) && (!section || s.section === section));
  const ids = new Set(scoped.map((s) => s.id));
  // records of deleted students are ignored here (see delete policy)
  const records = attendance.filter((a) =>
    ids.has(a.studentId) && (!subject || a.subject === subject) && (!from || a.date >= from) && (!to || a.date <= to));

  const perStudent = scoped.sort(byRoll).map((st) => ({
    studentId: st.id, rollNo: st.rollNo, name: st.name, className: st.className, section: st.section,
    ...count(records.filter((r) => r.studentId === st.id)),
  }));
  res.json({
    filters: { className, section, subject, from, to },
    totalStudents: scoped.length,
    ...count(records),
    bySubject: bySubject(records, config.subjects),
    students: perStudent,
  });
});

// ---- STUDENT (always the logged-in student's own records) --------------------------------
const mine = async (req) => (await store.read('attendance')).filter((a) => a.studentId === req.student.id);
const sortNewest = (a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject);

// GET /api/attendance/me/today
exports.myToday = asyncHandler(async (req, res) => {
  const today = todayIST();
  const records = (await mine(req)).filter((a) => a.date === today).sort((a, b) => a.subject.localeCompare(b.subject));
  res.json({ date: today, records: records.map(({ id, date, subject, status }) => ({ id, date, subject, status })) });
});

// GET /api/attendance/me/subjects
exports.mySubjects = asyncHandler(async (req, res) => {
  const records = await mine(req);
  res.json({ subjects: bySubject(records, config.subjects), overall: count(records), leaveCountsAsEligible: config.leaveCountsAsEligible });
});

// GET /api/attendance/me?subject&from&to
exports.myHistory = asyncHandler(async (req, res) => {
  const subject = str(req.query.subject);
  const { from, to } = validateRange(req.query);
  const all = await mine(req);
  const records = all
    .filter((a) => (!subject || a.subject === subject) && (!from || a.date >= from) && (!to || a.date <= to))
    .sort(sortNewest);
  res.json({
    records: records.map(({ id, date, subject: sub, status }) => ({ id, date, subject: sub, status })),
    summary: count(records),
  });
});
