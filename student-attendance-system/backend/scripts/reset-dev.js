/*
 * DEVELOPMENT ONLY. Deletes ALL data and uploaded files, then generates fresh dummy data.
 * A backup copy of everything is saved first in backend/backups/<timestamp>/.
 *
 *   npm run reset-dev                (asks you to type RESET)
 *   CONFIRM_RESET=RESET npm run reset-dev   (non-interactive; on Windows PowerShell: $env:CONFIRM_RESET="RESET"; npm run reset-dev)
 */
const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');
const config = require('../config');
const store = require('../utils/jsonStore');

async function confirm() {
  if (process.env.CONFIRM_RESET === 'RESET') return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) =>
    rl.question('This DELETES all students, attendance, assignments and uploads.\nA backup is saved first. Type RESET to continue: ', resolve));
  rl.close();
  return answer.trim() === 'RESET';
}

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dst);
    else if (!entry.name.endsWith('.tmp')) await fs.copyFile(src, dst);
  }
}

async function emptyDir(dir) {
  await fs.mkdir(dir, { recursive: true });
  for (const entry of await fs.readdir(dir)) {
    if (entry === '.gitkeep') continue;
    await fs.rm(path.join(dir, entry), { recursive: true, force: true });
  }
}

(async () => {
  if (config.isProd) {
    console.error('Refusing to run: NODE_ENV=production. This command is for development only.');
    process.exit(1);
  }
  if (!(await confirm())) {
    console.log('Cancelled. Nothing was changed.');
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(config.paths.root, 'backups', stamp);
  await store.ensureFiles();
  await copyDir(config.paths.data, path.join(backupDir, 'data'));
  await copyDir(path.join(config.paths.root, 'uploads'), path.join(backupDir, 'uploads'));
  console.log(`Backup saved to ${backupDir}`);

  await emptyDir(config.paths.data);
  await emptyDir(config.paths.assignmentUploads);
  await emptyDir(config.paths.submissionUploads);

  const { seedIfNeeded } = require('../seed');
  await seedIfNeeded({ force: true });
  console.log('Reset complete.');
})().catch((e) => { console.error('Reset failed:', e); process.exit(1); });
