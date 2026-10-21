// Small hand-written validators so the code stays easy to read.
const config = require('../config');
const { isValidDate } = require('./dates');
const HttpError = require('./HttpError');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function requireFields(errors, field, ok, message) {
  if (!ok) errors[field] = message;
}

function validateStudentInput(body) {
  const errors = {};
  const value = {
    name: str(body.name).replace(/\s+/g, ' '),
    rollNo: str(body.rollNo).toUpperCase(),
    email: str(body.email).toLowerCase(),
    className: str(body.className).toUpperCase(),
    section: str(body.section).toUpperCase(),
  };
  requireFields(errors, 'name', /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(value.name), 'Name must be 2-60 letters');
  requireFields(errors, 'rollNo', /^[A-Z0-9-]{2,20}$/.test(value.rollNo), 'Roll number must be 2-20 letters/numbers');
  requireFields(errors, 'email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email) && value.email.length <= 100, 'Enter a valid email address');
  requireFields(errors, 'className', /^[A-Z0-9 ]{1,20}$/.test(value.className), 'Class must be 1-20 letters/numbers');
  requireFields(errors, 'section', /^[A-Z0-9]{1,5}$/.test(value.section), 'Section must be 1-5 letters/numbers');
  return { errors, value };
}

function validateAssignmentInput(body) {
  const errors = {};
  const value = {
    title: str(body.title),
    description: str(body.description),
    className: str(body.className).toUpperCase(),
    section: str(body.section).toUpperCase(),
    subject: str(body.subject),
    dueDate: str(body.dueDate),
  };
  requireFields(errors, 'title', value.title.length >= 3 && value.title.length <= 120, 'Title must be 3-120 characters');
  requireFields(errors, 'description', value.description.length >= 1 && value.description.length <= 1000, 'Description is required (max 1000 characters)');
  requireFields(errors, 'className', /^[A-Z0-9 ]{1,20}$/.test(value.className), 'Class is required');
  requireFields(errors, 'section', /^[A-Z0-9]{1,5}$/.test(value.section), 'Section is required');
  requireFields(errors, 'subject', config.subjects.includes(value.subject), 'Choose a valid subject');
  requireFields(errors, 'dueDate', isValidDate(value.dueDate), 'Due date must be a valid date');
  return { errors, value };
}

function assertValid(errors) {
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
}

function validateRange(query) {
  const from = str(query.from);
  const to = str(query.to);
  if (from && !isValidDate(from)) throw new HttpError(400, 'Start date is invalid');
  if (to && !isValidDate(to)) throw new HttpError(400, 'End date is invalid');
  if (from && to && from > to) throw new HttpError(400, 'Start date must not be after end date');
  return { from, to };
}

module.exports = { str, validateStudentInput, validateAssignmentInput, validateRange, assertValid };
