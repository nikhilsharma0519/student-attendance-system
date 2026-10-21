// Multer setup + server-side checks of file type and size.
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const config = require('../config');
const HttpError = require('../utils/HttpError');

// Allowed types. The extension we store comes from THIS table, never from the user's filename.
const TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

function makeUploader(folder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, folder),
    filename: (req, file, cb) => {
      const ext = TYPES[file.mimetype] || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`); // unique, safe name
    },
  });
  return multer({
    storage,
    limits: { fileSize: config.maxUploadBytes, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!TYPES[file.mimetype] || !ALLOWED_EXT.includes(ext)) {
        return cb(new HttpError(400, 'Only PDF, JPG, JPEG and PNG files are allowed'));
      }
      cb(null, true);
    },
  }).single('file');
}

// Checks the first bytes of the saved file so a renamed .exe cannot pass as a PDF
async function hasValidSignature(fullPath, mimetype) {
  const handle = await fs.open(fullPath, 'r');
  try {
    const buf = Buffer.alloc(8);
    await handle.read(buf, 0, 8, 0);
    if (mimetype === 'application/pdf') return buf.slice(0, 4).toString('latin1') === '%PDF';
    if (mimetype === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (mimetype === 'image/png') return buf.slice(1, 4).toString('latin1') === 'PNG' && buf[0] === 0x89;
    return false;
  } finally {
    await handle.close();
  }
}

// Keep only a harmless display name (no folders, no control characters)
function cleanOriginalName(name) {
  const base = path.basename(String(name || 'file')).replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').trim();
  return (base || 'file').slice(0, 150);
}

// Resolves a stored file name inside a folder and refuses anything that escapes it (path traversal)
function safeResolve(folder, storedName) {
  const name = path.basename(String(storedName || ''));
  const full = path.resolve(folder, name);
  if (name !== storedName || !full.startsWith(path.resolve(folder) + path.sep)) {
    throw new HttpError(400, 'Invalid file reference');
  }
  return full;
}

module.exports = {
  assignmentUpload: makeUploader(config.paths.assignmentUploads),
  submissionUpload: makeUploader(config.paths.submissionUploads),
  hasValidSignature, cleanOriginalName, safeResolve,
};
