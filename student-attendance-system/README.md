# Student Attendance Management System

A full-stack college attendance application with two portals:

- **Admin portal** – add/delete students, take and edit attendance, view attendance summaries, upload and manage assignments.
- **Student portal** – personal dashboard, today / subject-wise / full attendance, assignments for the student's own class and section (view, download, submit work), profile.

**No database is used.** Everything is stored in JSON files on the backend (`backend/data/*.json`) and real files in `backend/uploads/`. On the very first start the app **generates dummy data automatically**, so you can test immediately without typing anything in.

---

## Technology stack

| Part | Technology |
|---|---|
| Frontend | React 18 + Vite, JavaScript, Tailwind CSS 3, React Router 6 |
| Backend | Node.js + Express 4 |
| Storage | JSON files via `fs/promises` (serialized writes, atomic temp-file + rename) |
| Authentication | bcrypt password hashing (`bcryptjs`, a pure-JavaScript bcrypt – no compiler needed on Windows), JWT in an `httpOnly` cookie |
| File uploads | Multer |

## Folder structure

```
student-attendance-system/
  package.json            root scripts (run both servers together)
  README.md
  .gitignore
  backend/
    server.js             Express app + start-up
    seed.js               automatic dummy-data generator
    config/index.js       settings (subjects, working days, timezone ...)
    routes/index.js       all API routes in one place
    controllers/          auth, students, attendance, assignments, submissions, dashboard
    middleware/           auth + roles, upload checks, error handler, login limiter
    utils/                jsonStore (storage layer), dates, stats, validators, pdf
    scripts/reset-dev.js  development reset (asks for confirmation)
    data/                 students.json users.json attendance.json assignments.json submissions.json
    uploads/assignments/  admin-uploaded assignment files
    uploads/submissions/  student-submitted work
  frontend/
    index.html, vite.config.js, tailwind.config.js, postcss.config.js
    src/
      main.jsx, App.jsx
      pages/              Login, AdminDashboard, AddStudent, Attendance, Assignments, DeleteStudent,
                          StudentDashboard, MyAttendance, MyAssignments, MyProfile
      layouts/            AdminLayout, StudentLayout, PortalLayout (sidebar)
      components/         shared UI (tables, badges, progress bars, dialogs), FileDrop, ProtectedRoute
      context/            AuthContext, ToastContext
      services/api.js     every backend call
```

> The `data/*.json` files do not exist until the first start – the backend creates them.

---

## 1. Requirements

- **Node.js 18.18 or newer** (Node 20 or 22 LTS recommended). Download from <https://nodejs.org>. Check with `node -v`.
- npm (installed together with Node.js).
- VS Code (optional) – open the `student-attendance-system` folder and use **Terminal → New Terminal**.

## 2. Install (once)

From the project root:

```bash
npm run setup
```

This installs the packages for the backend, the frontend and the root folder. (Or manually: `npm install --prefix backend`, `npm install --prefix frontend`, `npm install`.)

## 3. Run

### Easiest: both servers with one command

```bash
npm run dev
```

- Backend API: <http://localhost:5000>
- Frontend app: **<http://localhost:5173>** ← open this one

### Or in two terminals

```bash
# terminal 1
npm run start:backend
# terminal 2
npm run start:frontend
```

(Equivalent: `cd backend && npm run dev` and `cd frontend && npm run dev`.)

### Production-style single server (optional)

```bash
npm run build      # builds frontend/dist
npm run start      # Express serves the API and the built React app on http://localhost:5000
```
For real production use set `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (see below) and serve over HTTPS.

## 4. Demo logins (local development only)

| Role | Login | Password |
|---|---|---|
| Admin | `admin@college.edu` | `Admin@123` |
| Student | `rahul101@example.com` **or** username `cse101` | `Student@123` |

All 24 demo students use the password `Student@123`. A student can log in with their **email** or their **roll number in lower case** (e.g. `cse205`, `it103`). The login page also shows these hints, but only in development (`npm run dev`), never in a production build.

Demo classes: **CSE-A** (CSE101–108), **CSE-B** (CSE201–208), **IT-A** (IT101–108).

---

## 5. How the automatic dummy data works

`backend/seed.js` runs automatically when the backend starts and **no marker file exists** (`backend/data/.seed-complete`). It creates:

| What | Details |
|---|---|
| 24 students | 8 each in CSE-A, CSE-B, IT-A with unique roll numbers and emails → `students.json` |
| 25 login accounts | 1 admin + 1 per student, passwords **bcrypt-hashed** → `users.json` |
| ~1,500 attendance records | last 30 days incl. today, working days only, subjects DBMS / DAA / Web Technology / Machine Learning, realistic Present / Absent / Leave mix → `attendance.json` |
| 6 assignments | real sample PDFs in `backend/uploads/assignments/`, metadata in `assignments.json` |
| 3 submissions | real sample PDFs in `backend/uploads/submissions/` → `submissions.json` |

Safety rules:
- On later restarts the marker file makes the seed **skip itself** – nothing is regenerated or overwritten.
- Even if the marker is deleted, every seeded record has a **stable ID** and is only added *if missing*; duplicate roll numbers, emails and attendance (same student + date + subject) are never created, and real data is never touched.
- The "current date" always uses the **Asia/Kolkata** timezone. Today always gets some records so the "Today's Attendance" tab has data (a few students intentionally have none yet).
- `npm run seed` runs the same safe seeding by hand.

### Configurable settings
Create `backend/.env` (copy `backend/.env.example`) to change, for example:
```
WORKING_DAYS=1,2,3,4,5,6         # 0=Sunday ... 6=Saturday (default Mon-Fri)
SUBJECTS=DBMS,DAA,Web Technology,Machine Learning
MAX_UPLOAD_MB=5
SESSION_HOURS=8
```
Working days and subjects are used the next time data is seeded / the pages load. Existing data is not rewritten.

### Reset development dummy data safely
```bash
npm run reset-dev
```
It refuses to run when `NODE_ENV=production`, **asks you to type `RESET`**, saves a full backup of `data/` and `uploads/` to `backend/backups/<timestamp>/`, then deletes everything and seeds fresh dummy data.
Non-interactive form: PowerShell `$env:CONFIRM_RESET="RESET"; npm run reset-dev` · macOS/Linux `CONFIRM_RESET=RESET npm run reset-dev`.

## 6. The initial admin account

- **Development:** created automatically by the seed (`admin@college.edu` / `Admin@123`).
- **Production (`NODE_ENV=production`):** *no* dummy data and *no* default credentials are created. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 10 characters) in `backend/.env` and start the server once – the admin account is created if no admin exists. Then remove `ADMIN_PASSWORD` from the file. `JWT_SECRET` (16+ characters, random) is **required** in production.

## 7. Adding real students

1. Log in as admin → **Add Student**.
2. Enter name, roll number, email, class and section → **Add Student**.
3. A login account is created automatically. A **random temporary password is shown once** on screen – give it to the student. (Only its hash is stored.)
4. The student can log in with their email or roll number (lower case).

Duplicate roll numbers and duplicate emails are rejected. New classes/sections appear automatically in the Attendance and Assignments dropdowns.
To remove the dummy students, use **Delete Student**, or run `npm run reset-dev` and delete the ones you do not want.

## 8. Back up and restore

Everything lives in two folders under `backend/`:

- `data/` – the five JSON files
- `uploads/` – assignment and submission files

**Back up:** stop the server (or just copy – writes are atomic) and copy `backend/data` and `backend/uploads` to a safe place (e.g. `Copy-Item -Recurse backend\data D:\backup\data`).
**Restore:** stop the server, copy the saved `data` and `uploads` folders back over `backend/data` and `backend/uploads`, then start the server. The seed will not run because `.seed-complete` is restored with the data (or because the data already exists).

If a JSON file is ever damaged, the server refuses to overwrite it and reports `<file>.json is damaged` – restore it from a backup.

## 9. Rules and policies

- **Attendance %** = Present ÷ (Present + Absent) × 100. **Leave is not counted as a class** (change `leaveCountsAsEligible` in `backend/config/index.js` to count it). With no eligible records the app shows **"No records"**, never a division by zero.
- **One record per student + date + subject.** Saving again *updates* the existing record, so clicking Save repeatedly never duplicates data.
- **Attendance cannot be marked for a future date.** Class/section membership is checked on the server.
- **Deleting a student:** the student record and login account are removed; their **submissions and uploaded files are deleted**; their **past attendance records are kept** for reporting, flagged `studentDeleted: true` with a name snapshot, and excluded from class summaries. The roll number and email can be reused.
- **Deleting an assignment:** the metadata, the file, and all student submissions for it are removed.
- **Submissions:** one per student per assignment; uploading again replaces the previous file. Submissions after the due date are marked **Late**.

## 10. Security overview

- Passwords are hashed with bcrypt; hashes are never sent to the browser.
- Login uses an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production) with a JWT that expires after `SESSION_HOURS`. The token contains only the user id; role and student link are re-read from `users.json` on every request, so deleting/disabling an account takes effect immediately.
- Every route is authenticated; admin routes require the admin role. Students' own data is found from **their account**, never from an id sent by the browser.
- Assignments are shown/downloaded only if they match the student's class and section; submissions only to their owner and the admin.
- Uploads: PDF/JPG/JPEG/PNG only, size limit, file signature check, random server-generated file names; stored names are validated against path traversal. `data/` and `uploads/` are **not** served as static folders – files are only reachable through checked API routes.
- 10 failed logins per 15 minutes per IP + username are blocked.
- Browser `localStorage` is not used for application data.

## 11. API summary

All routes are under `/api`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Shared | `GET /meta` (subjects, classes/sections, limits) |
| Dashboards | `GET /dashboard/admin` · `GET /dashboard/student` |
| Students | `GET /students?search=&className=&section=` (admin) · `POST /students` · `DELETE /students/:id` · `GET /students/me` (student) |
| Attendance (admin) | `GET /attendance/roster?className&section&date&subject` · `POST /attendance` (save/update many) · `PUT /attendance/:id` · `GET /attendance/summary?className&section&subject&from&to` |
| Attendance (student) | `GET /attendance/me/today` · `GET /attendance/me/subjects` · `GET /attendance/me?subject&from&to` |
| Assignments | `GET /assignments` (admin: all, student: own class/section) · `POST /assignments` (admin, multipart) · `GET /assignments/:id/file[?download=1]` · `DELETE /assignments/:id` |
| Submissions | `POST /assignments/:id/submissions` (student) · `GET /submissions` · `GET /submissions/:id/file[?download=1]` |

## 12. Troubleshooting

- **Login page says "Cannot reach the server"** – the backend is not running; start it (`npm run dev`).
- **Port already in use** – change `PORT` in `backend/.env` (and the proxy target in `frontend/vite.config.js`).
- **`<file>.json is damaged`** – restore the file from your backup (see section 8).
- **Want a clean start** – `npm run reset-dev`.
