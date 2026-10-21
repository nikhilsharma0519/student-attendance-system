const bcrypt = require('bcryptjs');
const store = require('../utils/jsonStore');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const limiter = require('../middleware/loginLimiter');
const { COOKIE_NAME, cookieOptions, signToken } = require('../middleware/auth');

// A throw-away hash so the response time is the same whether or not the user exists
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

async function publicUser(user) {
  let name = 'Administrator';
  if (user.role === 'student') {
    const students = await store.read('students');
    const s = students.find((x) => x.id === user.studentId);
    name = s ? s.name : 'Student';
  }
  // passwordHash is intentionally never included
  return { id: user.id, role: user.role, email: user.email, username: user.username, studentId: user.studentId || null, name };
}

exports.login = asyncHandler(async (req, res) => {
  const identifier = String((req.body && req.body.identifier) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!identifier || !password) throw new HttpError(400, 'Enter your email/username and password');
  if (limiter.isBlocked(req)) throw new HttpError(429, 'Too many failed attempts. Please try again in 15 minutes');

  const users = await store.read('users');
  const user = users.find((u) => u.email.toLowerCase() === identifier || (u.username || '').toLowerCase() === identifier);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    limiter.recordFailure(req);
    throw new HttpError(401, 'Incorrect email/username or password');
  }
  if (user.status !== 'active') throw new HttpError(403, 'This account is disabled');

  limiter.clear(req);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ user: await publicUser(user) });
});

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out' });
};

exports.me = asyncHandler(async (req, res) => {
  const users = await store.read('users');
  const user = users.find((u) => u.id === req.user.id);
  res.json({ user: await publicUser(user) });
});
