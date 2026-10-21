// Date helpers. "College today" is always calculated in Asia/Kolkata, not the server's timezone.
const config = require('../config');

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});

function todayIST() {
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
}

function isValidDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

// Add days to a YYYY-MM-DD string (works on UTC so no timezone surprises)
function addDays(str, n) {
  const d = new Date(`${str}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 0 = Sunday ... 6 = Saturday
function weekday(str) {
  return new Date(`${str}T00:00:00Z`).getUTCDay();
}

module.exports = { todayIST, isValidDate, addDays, weekday };
