// JSON file storage layer (no database).
//  - creates the data folder and missing files (valid empty arrays)
//  - never resets an existing file
//  - all writes go through ONE queue, so concurrent requests cannot overwrite each other
//  - each write goes to a temp file first and is then renamed over the real file (atomic)
//  - if a multi-file change fails half way, already-written files are rolled back
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const FILES = ['students', 'users', 'attendance', 'assignments', 'submissions'];
const fileOf = (name) => {
  if (!FILES.includes(name)) throw new Error(`Unknown data file: ${name}`);
  return path.join(config.paths.data, `${name}.json`);
};

async function ensureFiles() {
  await fs.mkdir(config.paths.data, { recursive: true });
  await fs.mkdir(config.paths.assignmentUploads, { recursive: true });
  await fs.mkdir(config.paths.submissionUploads, { recursive: true });
  for (const name of FILES) {
    try {
      // 'wx' = create only if it does not exist. An existing file is never touched.
      await fs.writeFile(fileOf(name), '[]\n', { flag: 'wx' });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}

async function readRaw(name) {
  const file = fileOf(name);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return '[]\n';
    throw err;
  }
  return text;
}

function parse(name, text) {
  let data;
  try {
    data = JSON.parse(text || '[]');
  } catch {
    // Do NOT overwrite a damaged file - stop and tell the admin instead.
    const e = new Error(`${name}.json is damaged (invalid JSON). Restore it from a backup.`);
    e.status = 500;
    throw e;
  }
  if (!Array.isArray(data)) {
    const e = new Error(`${name}.json must contain a JSON array.`);
    e.status = 500;
    throw e;
  }
  return data;
}

// Read-only access (no lock needed because writes are atomic renames)
async function read(name) {
  return parse(name, await readRaw(name));
}

async function atomicWrite(name, text) {
  const file = fileOf(name);
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, text, 'utf8');
  // Windows can briefly refuse to rename (antivirus / indexer), so retry a few times
  let lastErr;
  for (let i = 0; i < 5; i++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
  await fs.rm(tmp, { force: true });
  throw lastErr;
}

// ---- the single write queue -------------------------------------------------
let tail = Promise.resolve();
function enqueue(task) {
  const run = tail.then(task);
  tail = run.catch(() => {}); // keep the queue alive after a failure
  return run;
}

/**
 * Safely change one or more files.
 *   await transaction(['students','users'], async (db) => {
 *     db.students.push(...); db.users.push(...);
 *     return something;
 *   });
 * If fn throws, nothing is written. Only files that changed are written.
 */
function transaction(names, fn) {
  return enqueue(async () => {
    const original = {};
    const db = {};
    for (const name of names) {
      original[name] = await readRaw(name);
      db[name] = parse(name, original[name]);
    }
    const result = await fn(db);

    const written = [];
    try {
      for (const name of names) {
        const before = JSON.stringify(parse(name, original[name]), null, 2) + '\n';
        const next = JSON.stringify(db[name], null, 2) + '\n';
        if (next !== before) {
          await atomicWrite(name, next);
          written.push(name);
        }
      }
    } catch (err) {
      // roll back files already written so a multi-file change is all-or-nothing
      for (const name of written) {
        try { await atomicWrite(name, original[name]); } catch { /* best effort */ }
      }
      throw err;
    }
    return result;
  });
}

// Delete a file inside an upload folder, ignoring "already gone"
async function removeFileQuietly(fullPath) {
  try { await fs.rm(fullPath, { force: true }); } catch { /* ignore */ }
}

const newId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

module.exports = { FILES, ensureFiles, read, transaction, removeFileQuietly, newId };
