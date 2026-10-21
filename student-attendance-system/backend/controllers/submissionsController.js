const store = require('../utils/jsonStore');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { todayIST } = require('../utils/dates');
const { hasValidSignature, cleanOriginalName, safeResolve } = require('../middleware/upload');

const publicSub = ({ storedName, ...rest }) => rest; // eslint-disable-line no-unused-vars

// POST /api/assignments/:id/submissions   (student, multipart "file")
// One submission per student per assignment. Uploading again replaces the old one.
exports.create = asyncHandler(async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new HttpError(400, 'Please choose a PDF, JPG or PNG file');
    if (!(await hasValidSignature(file.path, file.mimetype))) throw new HttpError(400, 'The file content does not match its type');

    let oldFile = null;
    const record = await store.transaction(['assignments', 'submissions'], async (db) => {
      const a = db.assignments.find((x) => x.id === req.params.id);
      // Same message for "missing" and "other class" so ids cannot be probed
      if (!a || a.className !== req.student.className || a.section !== req.student.section) {
        throw new HttpError(404, 'Assignment not found');
      }
      const now = new Date().toISOString();
      const rec = {
        id: store.newId('sub'), assignmentId: a.id, studentId: req.student.id,
        originalName: cleanOriginalName(file.originalname), storedName: file.filename,
        filePath: `uploads/submissions/${file.filename}`, mimeType: file.mimetype, size: file.size,
        submittedAt: now, late: todayIST() > a.dueDate,
      };
      const idx = db.submissions.findIndex((s) => s.assignmentId === a.id && s.studentId === req.student.id);
      if (idx >= 0) { oldFile = db.submissions[idx].storedName; db.submissions[idx] = rec; } else db.submissions.push(rec);
      return rec;
    });
    if (oldFile) await store.removeFileQuietly(safeResolve(config.paths.submissionUploads, oldFile));
    res.status(201).json({ submission: publicSub(record), message: 'Submission uploaded successfully' });
  } catch (err) {
    if (file) await store.removeFileQuietly(file.path);
    throw err;
  }
});

// GET /api/submissions?assignmentId=   admin: all / student: only own
exports.list = asyncHandler(async (req, res) => {
  const [subs, students] = await Promise.all([store.read('submissions'), store.read('students')]);
  let list = subs;
  if (req.user.role === 'student') list = list.filter((s) => s.studentId === req.student.id);
  if (req.query.assignmentId) list = list.filter((s) => s.assignmentId === String(req.query.assignmentId));
  const names = new Map(students.map((s) => [s.id, s]));
  res.json({
    submissions: list.map((s) => ({
      ...publicSub(s),
      studentName: names.get(s.studentId) ? names.get(s.studentId).name : 'Unknown',
      rollNo: names.get(s.studentId) ? names.get(s.studentId).rollNo : '',
    })),
  });
});

// GET /api/submissions/:id/file
exports.file = asyncHandler(async (req, res) => {
  const subs = await store.read('submissions');
  const s = subs.find((x) => x.id === req.params.id);
  if (!s || (req.user.role === 'student' && s.studentId !== req.student.id)) throw new HttpError(404, 'Submission not found');
  const full = safeResolve(config.paths.submissionUploads, s.storedName);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(s.mimeType);
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(s.originalName)}`);
  res.sendFile(full, (err) => { if (err && !res.headersSent) res.status(404).json({ message: 'The file is missing on the server' }); });
});
