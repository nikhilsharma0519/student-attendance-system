const store = require('../utils/jsonStore');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { todayIST } = require('../utils/dates');
const { validateAssignmentInput, assertValid, str } = require('../utils/validators');
const { hasValidSignature, cleanOriginalName, safeResolve } = require('../middleware/upload');

// What the browser sees about an assignment (never the server path)
function publicAssignment(a) {
  const { storedName, ...rest } = a; // eslint-disable-line no-unused-vars
  return rest;
}

// Adds "Submitted / Pending / Overdue" for one student
function withStatus(a, submissions, studentId, today) {
  const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === studentId);
  let status = 'Pending';
  if (sub) status = 'Submitted';
  else if (a.dueDate < today) status = 'Overdue';
  return {
    ...publicAssignment(a),
    submissionStatus: status,
    submission: sub ? { id: sub.id, originalName: sub.originalName, submittedAt: sub.submittedAt, late: sub.late } : null,
  };
}

// GET /api/assignments   admin: everything (optional filters) / student: ONLY own class + section
exports.list = asyncHandler(async (req, res) => {
  const assignments = await store.read('assignments');
  const sortNew = (a, b) => b.uploadedAt.localeCompare(a.uploadedAt);

  if (req.user.role === 'admin') {
    const className = str(req.query.className).toUpperCase();
    const section = str(req.query.section).toUpperCase();
    const subject = str(req.query.subject);
    const list = assignments
      .filter((a) => (!className || a.className === className) && (!section || a.section === section) && (!subject || a.subject === subject))
      .sort(sortNew);
    return res.json({ assignments: list.map(publicAssignment) });
  }

  // student: class and section come from the server-side profile, not from the request
  const submissions = await store.read('submissions');
  const today = todayIST();
  const list = assignments
    .filter((a) => a.className === req.student.className && a.section === req.student.section)
    .sort(sortNew)
    .map((a) => withStatus(a, submissions, req.student.id, today));
  res.json({ assignments: list });
});

// POST /api/assignments   (admin, multipart/form-data with field "file")
exports.create = asyncHandler(async (req, res) => {
  const file = req.file;
  const discard = () => (file ? store.removeFileQuietly(file.path) : null);
  try {
    const { errors, value } = validateAssignmentInput(req.body || {});
    if (!file) errors.file = 'Please choose a PDF, JPG or PNG file';
    assertValid(errors);
    if (!(await hasValidSignature(file.path, file.mimetype))) {
      throw new HttpError(400, 'The file content does not match its type', { file: 'File is not a valid PDF/JPG/PNG' });
    }

    const now = new Date();
    const record = {
      id: store.newId('assign'),
      ...value,
      uploadedDate: todayIST(),
      uploadedAt: now.toISOString(),
      originalName: cleanOriginalName(file.originalname),
      storedName: file.filename,
      filePath: `uploads/assignments/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user.id,
    };
    await store.transaction(['assignments'], async (db) => { db.assignments.push(record); });
    res.status(201).json({ assignment: publicAssignment(record), message: 'Assignment uploaded successfully' });
  } catch (err) {
    await discard(); // metadata was not saved, so do not leave an orphan file
    throw err;
  }
});

// Finds an assignment and checks that THIS user may open it
async function findAllowed(req) {
  const assignments = await store.read('assignments');
  const a = assignments.find((x) => x.id === req.params.id);
  if (!a) throw new HttpError(404, 'Assignment not found');
  if (req.user.role === 'student' && (a.className !== req.student.className || a.section !== req.student.section)) {
    throw new HttpError(403, 'This assignment is not for your class');
  }
  return a;
}

// GET /api/assignments/:id/file?download=1
exports.file = asyncHandler(async (req, res) => {
  const a = await findAllowed(req);
  const full = safeResolve(config.paths.assignmentUploads, a.storedName);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(a.mimeType);
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(a.originalName)}`);
  res.sendFile(full, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'The file is missing on the server' });
  });
});

/*
 * DELETE /api/assignments/:id    (admin)
 * Removes the metadata, every student submission for it, and then the files from disk.
 */
exports.remove = asyncHandler(async (req, res) => {
  const { assignment, submissions } = await store.transaction(['assignments', 'submissions'], async (db) => {
    const a = db.assignments.find((x) => x.id === req.params.id);
    if (!a) throw new HttpError(404, 'Assignment not found');
    db.assignments = db.assignments.filter((x) => x.id !== a.id);
    const subs = db.submissions.filter((s) => s.assignmentId === a.id);
    db.submissions = db.submissions.filter((s) => s.assignmentId !== a.id);
    return { assignment: a, submissions: subs };
  });
  await store.removeFileQuietly(safeResolve(config.paths.assignmentUploads, assignment.storedName));
  for (const s of submissions) await store.removeFileQuietly(safeResolve(config.paths.submissionUploads, s.storedName));
  res.json({ message: 'Assignment deleted successfully' });
});

exports.withStatus = withStatus;
