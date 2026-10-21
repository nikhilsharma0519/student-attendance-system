// Every call to the backend goes through this file.
// Nothing is stored in localStorage: the login session is an httpOnly cookie managed by the server.
const BASE = '/api';

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function request(method, url, { body, form } = {}) {
  const options = { method, credentials: 'include', headers: {} };
  if (form) options.body = form; // browser sets the multipart header
  else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(BASE + url, options);
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/login') && onUnauthorized) onUnauthorized();
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.fieldErrors = (data && data.errors) || {};
    throw err;
  }
  return data;
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // auth
  login: (identifier, password) => request('POST', '/auth/login', { body: { identifier, password } }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  meta: () => request('GET', '/meta'),

  // dashboards
  adminDashboard: () => request('GET', '/dashboard/admin'),
  studentDashboard: () => request('GET', '/dashboard/student'),

  // students
  listStudents: (params) => request('GET', `/students${qs(params)}`),
  addStudent: (student) => request('POST', '/students', { body: student }),
  deleteStudent: (id) => request('DELETE', `/students/${encodeURIComponent(id)}`),
  myProfile: () => request('GET', '/students/me'),

  // attendance (admin)
  roster: (params) => request('GET', `/attendance/roster${qs(params)}`),
  saveAttendance: (payload) => request('POST', '/attendance', { body: payload }),
  attendanceSummary: (params) => request('GET', `/attendance/summary${qs(params)}`),
  // attendance (student)
  myToday: () => request('GET', '/attendance/me/today'),
  mySubjects: () => request('GET', '/attendance/me/subjects'),
  myAttendance: (params) => request('GET', `/attendance/me${qs(params)}`),

  // assignments
  listAssignments: (params) => request('GET', `/assignments${qs(params)}`),
  uploadAssignment: (form) => request('POST', '/assignments', { form }),
  deleteAssignment: (id) => request('DELETE', `/assignments/${encodeURIComponent(id)}`),
  assignmentFileUrl: (id, download = false) => `${BASE}/assignments/${encodeURIComponent(id)}/file${download ? '?download=1' : ''}`,

  // submissions
  submitWork: (assignmentId, form) => request('POST', `/assignments/${encodeURIComponent(assignmentId)}/submissions`, { form }),
  listSubmissions: (params) => request('GET', `/submissions${qs(params)}`),
  submissionFileUrl: (id, download = false) => `${BASE}/submissions/${encodeURIComponent(id)}/file${download ? '?download=1' : ''}`,
};
