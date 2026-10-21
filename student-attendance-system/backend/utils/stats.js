// Attendance maths shared by admin and student endpoints.
const config = require('../config');

function count(records) {
  const out = { total: records.length, present: 0, absent: 0, leave: 0 };
  for (const r of records) {
    if (r.status === 'Present') out.present++;
    else if (r.status === 'Absent') out.absent++;
    else if (r.status === 'Leave') out.leave++;
  }
  // Eligible classes = Present + Absent (Leave is excluded by default)
  out.eligible = out.present + out.absent + (config.leaveCountsAsEligible ? out.leave : 0);
  // null means "No records" - never divide by zero
  out.percentage = out.eligible > 0 ? Math.round((out.present / out.eligible) * 1000) / 10 : null;
  return out;
}

function bySubject(records, subjects) {
  const names = [...new Set([...subjects, ...records.map((r) => r.subject)])];
  return names.map((subject) => ({ subject, ...count(records.filter((r) => r.subject === subject)) }));
}

module.exports = { count, bySubject };
