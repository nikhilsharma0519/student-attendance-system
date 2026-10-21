// Very small in-memory limiter: 10 failed logins per 15 minutes for the same IP + username.
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 10;

const keyOf = (req) => `${req.ip}|${String((req.body && req.body.identifier) || '').toLowerCase()}`;

function isBlocked(req) {
  const rec = attempts.get(keyOf(req));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW) { attempts.delete(keyOf(req)); return false; }
  return rec.count >= MAX;
}
function recordFailure(req) {
  const k = keyOf(req);
  const rec = attempts.get(k);
  if (!rec || Date.now() - rec.first > WINDOW) attempts.set(k, { count: 1, first: Date.now() });
  else rec.count++;
}
function clear(req) { attempts.delete(keyOf(req)); }

module.exports = { isBlocked, recordFailure, clear };
