const store = require('../utils/jsonStore');
const asyncHandler = require('../utils/asyncHandler');
const { todayIST } = require('../utils/dates');
const { count } = require('../utils/stats');

// GET /api/dashboard/admin
exports.admin = asyncHandler(async (req, res) => {
  const [students, attendance, assignments] = await Promise.all([
    store.read('students'), store.read('attendance'), store.read('assignments'),
  ]);
  const classes = new Set(students.map((s) => s.className));
  const classSections = new Set(students.map((s) => `${s.className}-${s.section}`));

  // "sessions" = one class/section/date/subject roll call
  const sessions = new Map();
  for (const a of attendance) {
    const key = `${a.className}|${a.section}|${a.date}|${a.subject}`;
    const s = sessions.get(key) || { className: a.className, section: a.section, date: a.date, subject: a.subject, updatedAt: '', records: [] };
    s.records.push(a);
    if (a.updatedAt > s.updatedAt) s.updatedAt = a.updatedAt;
    sessions.set(key, s);
  }
  const recentAttendance = [...sessions.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map(({ records, updatedAt, ...s }) => ({ ...s, ...count(records) }));

  res.json({
    totalStudents: students.length,
    totalClasses: classes.size,
    totalClassSections: classSections.size,
    totalAttendanceRecords: attendance.length,
    totalAssignments: assignments.length,
    recentStudents: [...students].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5),
    recentAttendance,
  });
});

// GET /api/dashboard/student
exports.student = asyncHandler(async (req, res) => {
  const [attendance, assignments, submissions] = await Promise.all([
    store.read('attendance'), store.read('assignments'), store.read('submissions'),
  ]);
  const me = req.student;
  const stats = count(attendance.filter((a) => a.studentId === me.id));
  const today = todayIST();
  const mine = assignments.filter((a) => a.className === me.className && a.section === me.section);
  const open = mine.filter((a) => !submissions.some((s) => s.assignmentId === a.id && s.studentId === me.id));

  res.json({
    student: { name: me.name, rollNo: me.rollNo, className: me.className, section: me.section },
    attendancePercentage: stats.percentage,
    totalClassesRecorded: stats.total,
    classesAttended: stats.present,
    pendingAssignments: open.length,
    overdueAssignments: open.filter((a) => a.dueDate < today).length,
    totalAssignments: mine.length,
  });
});
