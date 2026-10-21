// Central configuration. Everything else imports settings from here.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

function list(value, fallback) {
  const items = (value || '').split(',').map((s) => s.trim()).filter(Boolean);
  return items.length ? items : fallback;
}

// JWT secret: required in production; in development generate one and keep it in a git-ignored file
function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) return process.env.JWT_SECRET;
  if (isProd) {
    throw new Error('JWT_SECRET (at least 16 characters) must be set when NODE_ENV=production');
  }
  const file = path.join(ROOT, '.jwt-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: resolveJwtSecret(),
  sessionHours: Number(process.env.SESSION_HOURS) || 8,
  timezone: 'Asia/Kolkata',
  // 0 = Sunday ... 6 = Saturday
  workingDays: list(process.env.WORKING_DAYS, ['1', '2', '3', '4', '5']).map(Number),
  subjects: list(process.env.SUBJECTS, ['DBMS', 'DAA', 'Web Technology', 'Machine Learning']),
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024,
  statuses: ['Present', 'Absent', 'Leave'],
  // Leave records are NOT counted as classes when calculating the percentage
  leaveCountsAsEligible: false,
  paths: {
    root: ROOT,
    data: path.join(ROOT, 'data'),
    assignmentUploads: path.join(ROOT, 'uploads', 'assignments'),
    submissionUploads: path.join(ROOT, 'uploads', 'submissions'),
    seedMarker: path.join(ROOT, 'data', '.seed-complete'),
  },
  demo: {
    adminEmail: 'admin@college.edu',
    adminPassword: 'Admin@123',
    studentPassword: 'Student@123',
  },
};
