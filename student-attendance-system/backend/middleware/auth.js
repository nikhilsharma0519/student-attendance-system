const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../utils/jsonStore');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'sams_token';

function cookieOptions() {
  return {
    httpOnly: true,                 // JavaScript in the browser cannot read the token
    sameSite: 'lax',                // blocks cross-site form posts
    secure: config.isProd,          // HTTPS only in production
    maxAge: config.sessionHours * 3600 * 1000,
    path: '/',
  };
}

function signToken(user) {
  // Only the user id is stored in the token. Role and student link are re-read from users.json on every request.
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: `${config.sessionHours}h` });
}

// Reads the cookie, verifies it, loads the CURRENT account, and sets req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) throw new HttpError(401, 'Please log in');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'Your session has expired. Please log in again');
  }
  const users = await store.read('users');
  const user = users.find((u) => u.id === payload.sub);
  if (!user || user.status !== 'active') {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    throw new HttpError(401, 'This account is not active');
  }
  req.user = { id: user.id, role: user.role, email: user.email, username: user.username, studentId: user.studentId || null };
  next();
});

// Role check. The role always comes from the server-side account, never from the request.
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return next(new HttpError(403, 'You do not have permission to do this'));
  }
  next();
};

// For student routes: loads the logged-in student's own profile from the token's account
const loadOwnStudent = asyncHandler(async (req, res, next) => {
  if (!req.user.studentId) throw new HttpError(403, 'No student profile is linked to this account');
  const students = await store.read('students');
  const student = students.find((s) => s.id === req.user.studentId);
  if (!student) throw new HttpError(404, 'Student profile not found');
  req.student = student;
  next();
});

module.exports = { COOKIE_NAME, cookieOptions, signToken, authenticate, requireRole, loadOwnStudent };
