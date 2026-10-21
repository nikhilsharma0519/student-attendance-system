/*
 * Automatic dummy-data generator.
 *  - Runs automatically on the FIRST server start (server.js calls seedIfNeeded()).
 *  - Can also be run by hand:  npm run seed
 *  - A marker file (data/.seed-complete) stops it from running again, and every record has a
 *    stable ID, so even without the marker nothing is duplicated and nothing is overwritten.
 *  - In production (NODE_ENV=production) NO dummy data is created. Only the first admin account is
 *    created, from ADMIN_EMAIL / ADMIN_PASSWORD, if no admin exists yet.
 */
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const store = require('./utils/jsonStore');
const { makePdf } = require('./utils/pdf');
const { todayIST, addDays, weekday } = require('./utils/dates');

// small repeatable random generator, so the demo data looks the same on every machine
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STUDENT_NAMES = {
  'CSE-A': ['Rahul Sharma', 'Priya Verma', 'Amit Singh', 'Neha Gupta', 'Karan Mehta', 'Anjali Nair', 'Vikram Rao', 'Sneha Iyer'],
  'CSE-B': ['Rohan Das', 'Pooja Joshi', 'Arjun Reddy', 'Divya Menon', 'Sanjay Patel', 'Kavya Pillai', 'Manish Kumar', 'Ritu Chopra'],
  'IT-A': ['Aditya Khanna', 'Meera Kapoor', 'Siddharth Jain', 'Nisha Bhatt', 'Varun Malhotra', 'Isha Agarwal', 'Harsh Vardhan', 'Tanvi Desai'],
};
const ROLL_BASE = { 'CSE-A': ['CSE', 101], 'CSE-B': ['CSE', 201], 'IT-A': ['IT', 101] };

function buildStudents(now) {
  const list = [];
  let n = 0;
  for (const [key, names] of Object.entries(STUDENT_NAMES)) {
    const [className, section] = key.split('-');
    const [prefix, start] = ROLL_BASE[key];
    names.forEach((name, i) => {
      n++;
      const rollNo = `${prefix}${start + i}`;
      list.push({
        id: `student_${String(n).padStart(3, '0')}`,
        name,
        rollNo,
        email: `${name.split(' ')[0].toLowerCase()}${rollNo.replace(/\D/g, '')}@example.com`,
        className,
        section,
        createdAt: new Date(now - (30 - n) * 60000).toISOString(),
      });
    });
  }
  // make sure emails are unique even if two first names collide
  const seen = new Set();
  for (const s of list) {
    if (seen.has(s.email)) s.email = `${s.rollNo.toLowerCase()}@example.com`;
    seen.add(s.email);
  }
  return list;
}

function buildAttendance(students, today) {
  const rand = mulberry32(20260101);
  const subjects = config.subjects;
  const records = [];
  let counter = 0;
  const propensity = new Map(students.map((s) => [s.id, 0.72 + rand() * 0.25])); // each student has their own habit

  for (let back = 29; back >= 0; back--) {
    const date = addDays(today, -back);
    const isToday = back === 0;
    // today is always included so the "Today's Attendance" screen has data, even on a weekend
    if (!isToday && !config.workingDays.includes(weekday(date))) continue;

    const dayNumber = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86400000);
    const howMany = isToday ? Math.min(2, subjects.length) : Math.min(3, subjects.length);
    const todays = [];
    for (let k = 0; k < howMany; k++) todays.push(subjects[(dayNumber + k) % subjects.length]);

    students.forEach((st, idx) => {
      if (isToday && idx % 8 === 7) return; // a few students have no record yet today
      for (const subject of todays) {
        let status;
        const r = rand();
        if (r < 0.04) status = 'Leave';
        else status = rand() < propensity.get(st.id) ? 'Present' : 'Absent';
        counter++;
        const stamp = `${date}T09:00:00.000Z`;
        records.push({
          id: `att_seed_${String(counter).padStart(5, '0')}`,
          studentId: st.id, rollNo: st.rollNo, className: st.className, section: st.section,
          date, subject, status, markedBy: 'user_admin', createdAt: stamp, updatedAt: stamp,
        });
      }
    });
  }
  return records;
}

const ASSIGNMENTS = [
  { n: 1, title: 'DBMS Assignment 1', subject: 'DBMS', className: 'CSE', section: 'A', due: 7, ago: 3, description: 'Draw the ER diagram for a library system and convert it into relational tables with keys.' },
  { n: 2, title: 'DAA Sorting Algorithms', subject: 'DAA', className: 'CSE', section: 'B', due: 3, ago: 4, description: 'Compare merge sort, quick sort and heap sort. Include time complexity and a short example for each.' },
  { n: 3, title: 'Web Technology HTML and CSS', subject: 'Web Technology', className: 'IT', section: 'A', due: -2, ago: 12, description: 'Build a responsive personal profile page using semantic HTML and CSS flexbox.' },
  { n: 4, title: 'Machine Learning Basics', subject: 'Machine Learning', className: 'CSE', section: 'A', due: 10, ago: 1, description: 'Explain supervised vs unsupervised learning with two real-world examples each.' },
  { n: 5, title: 'SQL Practice Assignment', subject: 'DBMS', className: 'CSE', section: 'B', due: -5, ago: 14, description: 'Solve the 15 SQL queries on joins, grouping and subqueries given in the attached sheet.' },
  { n: 6, title: 'DBMS Normalization Worksheet', subject: 'DBMS', className: 'IT', section: 'A', due: 5, ago: 2, description: 'Normalize the given relation up to 3NF and list all functional dependencies.' },
];

const SUBMISSIONS = [
  { n: 1, studentId: 'student_001', assignmentId: 'assign_001' },
  { n: 2, studentId: 'student_003', assignmentId: 'assign_001' },
  { n: 3, studentId: 'student_009', assignmentId: 'assign_005' }, // after the due date -> "late"
];

const assignmentId = (n) => `assign_${String(n).padStart(3, '0')}`;

async function writeIfMissing(file, buffer) {
  try { await fs.writeFile(file, buffer, { flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
}

async function markerExists() {
  try { await fs.access(config.paths.seedMarker); return true; } catch { return false; }
}

async function seedProductionAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const existing = await store.read('users');
  if (existing.some((u) => u.role === 'admin')) return;
  if (!email || password.length < 10) {
    console.warn('[seed] Production: no admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters) and restart.');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await store.transaction(['users'], async (db) => {
    db.users.push({ id: 'user_admin', email, username: 'admin', passwordHash, role: 'admin', studentId: null, status: 'active', createdAt: new Date().toISOString() });
  });
  console.log(`[seed] Production admin created: ${email}`);
}

async function seedIfNeeded({ force = false } = {}) {
  await store.ensureFiles();
  if (config.isProd) {
    await seedProductionAdmin();
    return { seeded: false, reason: 'production' };
  }
  if (!force && (await markerExists())) return { seeded: false, reason: 'already seeded' };

  console.log('[seed] First-time setup: generating dummy data ...');
  const today = todayIST();
  const now = Date.now();
  const students = buildStudents(now);
  const attendance = buildAttendance(students, today);

  // password hashes (bcrypt)
  const adminHash = await bcrypt.hash(config.demo.adminPassword, 10);
  const studentHash = await bcrypt.hash(config.demo.studentPassword, 10); // salt is inside the hash; same demo password for all demo students
  const nowIso = new Date(now).toISOString();
  const users = [
    { id: 'user_admin', email: config.demo.adminEmail, username: 'admin', passwordHash: adminHash, role: 'admin', studentId: null, status: 'active', createdAt: nowIso },
    ...students.map((s, i) => ({
      id: `user_${String(i + 1).padStart(3, '0')}`, email: s.email, username: s.rollNo.toLowerCase(),
      passwordHash: studentHash, role: 'student', studentId: s.id, status: 'active', createdAt: nowIso,
    })),
  ];

  // sample files on disk
  const assignments = [];
  for (const a of ASSIGNMENTS) {
    const id = assignmentId(a.n);
    const storedName = `seed_${id}.pdf`;
    const pdf = makePdf(a.title, [
      `Subject: ${a.subject}`, `Class: ${a.className}  Section: ${a.section}`, `Due date: ${addDays(today, a.due)}`, '',
      ...a.description.match(/.{1,80}(\s|$)/g).map((l) => l.trim()), '', '(Sample file generated by the demo seed script)',
    ]);
    await writeIfMissing(path.join(config.paths.assignmentUploads, storedName), pdf);
    const uploadedDate = addDays(today, -a.ago);
    assignments.push({
      id, title: a.title, description: a.description, className: a.className, section: a.section, subject: a.subject,
      dueDate: addDays(today, a.due), uploadedDate, uploadedAt: `${uploadedDate}T08:00:00.000Z`,
      originalName: `${a.title.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`, storedName, filePath: `uploads/assignments/${storedName}`,
      mimeType: 'application/pdf', size: pdf.length, uploadedBy: 'user_admin',
    });
  }
  const submissions = [];
  for (const s of SUBMISSIONS) {
    const a = assignments.find((x) => x.id === s.assignmentId);
    const st = students.find((x) => x.id === s.studentId);
    const storedName = `seed_submission_${String(s.n).padStart(3, '0')}.pdf`;
    const pdf = makePdf(`Submission: ${a.title}`, [`Student: ${st.name} (${st.rollNo})`, '(Sample submission generated by the demo seed script)']);
    await writeIfMissing(path.join(config.paths.submissionUploads, storedName), pdf);
    const when = addDays(a.dueDate, a.dueDate < today ? 1 : -1);
    submissions.push({
      id: `sub_${String(s.n).padStart(3, '0')}`, assignmentId: a.id, studentId: st.id, originalName: `${st.rollNo}_solution.pdf`,
      storedName, filePath: `uploads/submissions/${storedName}`, mimeType: 'application/pdf', size: pdf.length,
      submittedAt: `${when}T10:00:00.000Z`, late: when > a.dueDate,
    });
  }

  // Save everything. "Add only if missing" keeps real data safe if this ever runs against a non-empty store.
  const counts = await store.transaction(['students', 'users', 'attendance', 'assignments', 'submissions'], async (db) => {
    const c = { students: 0, users: 0, attendance: 0, assignments: 0, submissions: 0 };
    for (const s of students) {
      const clash = db.students.some((x) => x.id === s.id || x.rollNo === s.rollNo || x.email === s.email);
      if (!clash) { db.students.push(s); c.students++; }
    }
    const studentIds = new Set(db.students.map((s) => s.id));
    for (const u of users) {
      const clash = db.users.some((x) => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase() || x.username === u.username);
      if (!clash && (u.role === 'admin' || studentIds.has(u.studentId))) { db.users.push(u); c.users++; }
    }
    const keys = new Set(db.attendance.map((a) => `${a.studentId}|${a.date}|${a.subject}`));
    const ids = new Set(db.attendance.map((a) => a.id));
    for (const a of attendance) {
      const key = `${a.studentId}|${a.date}|${a.subject}`;
      if (!keys.has(key) && !ids.has(a.id) && studentIds.has(a.studentId)) { db.attendance.push(a); c.attendance++; }
    }
    for (const a of assignments) if (!db.assignments.some((x) => x.id === a.id)) { db.assignments.push(a); c.assignments++; }
    for (const s of submissions) {
      if (!db.submissions.some((x) => x.id === s.id || (x.studentId === s.studentId && x.assignmentId === s.assignmentId))) { db.submissions.push(s); c.submissions++; }
    }
    return c;
  });

  await fs.writeFile(config.paths.seedMarker, JSON.stringify({ seededAt: nowIso, counts }, null, 2));
  console.log('[seed] Done:', counts);
  console.log(`[seed] Demo admin:   ${config.demo.adminEmail} / ${config.demo.adminPassword}`);
  console.log(`[seed] Demo student: ${students[0].email} (or ${students[0].rollNo.toLowerCase()}) / ${config.demo.studentPassword}`);
  return { seeded: true, counts };
}

module.exports = { seedIfNeeded };

// `npm run seed` -> runs the same safe seeding by hand
if (require.main === module) {
  seedIfNeeded()
    .then((r) => { if (!r.seeded) console.log(`[seed] Skipped (${r.reason}). Use "npm run reset-dev" to start over.`); })
    .catch((e) => { console.error('[seed] failed:', e); process.exit(1); });
}
