# Employee Directory

**Live:** [Employee Directory](https://employee-directory.duckdns.org/)

A full-stack MERN app to manage employees — search, filter by department, add/edit/delete records, all behind login.

Built this as a project to practice building a production-style app with proper auth, validation and a clean folder structure instead of just throwing stuff together.

## Live Features

- Signup/Login with JWT stored in HttpOnly cookies (not localStorage, so it's safer against XSS)
- View employees grouped by department on the home page
- Global search across all employees
- Search within a department
- Add new employee (form changes based on Fresher/Experienced)
- Edit employee details
- Delete employee (soft delete — record isn't actually removed from DB, just hidden)
- Light/dark mode toggle
- Fully responsive (works fine on mobile)

## Tech Stack

**Frontend:** React + Vite, React Router, Axios, Tailwind CSS, react-hot-toast for notifications

**Backend:** Node + Express, MongoDB with Mongoose, JWT for auth, bcrypt for password hashing

**Validation:** Zod schema shared between frontend and backend so the rules stay in one place instead of duplicating logic

**Other:** Helmet, CORS, rate limiting, and a small in-memory cache on the backend to avoid hitting MongoDB on every request

## Folder Structure

```
backend/src/
  controllers/, models/, routes/, services/, middlewares/, config/

frontend/src/
  components/, pages/, services/, context/, hooks/

shared/
  schemas/   (zod schema shared by frontend + backend)
```

## Running it locally

You'll need Node 18+ and either a local MongoDB instance or an Atlas connection string.

```bash
# install shared package first — both frontend & backend depend on it
cd shared && npm install

cd ../backend && npm install
cd ../frontend && npm install
```

Copy the env files and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then run both (two terminals):

```bash
# backend — http://localhost:5000
cd backend && npm run dev

# frontend — http://localhost:5173
cd frontend && npm run dev
```

Go to `/signup`, make an account, then log in.

### Docker (optional)

There's a `docker-compose.yml` if you'd rather run it in containers:

```bash
docker compose up -d
```

## API quick reference

- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — login, sets cookies
- `GET /api/employees` — list employees (search/filter/paginate)
- `POST /api/employees` — add employee
- `PUT /api/employees/:id` — update employee
- `DELETE /api/employees/:id` — soft-delete employee
- `GET /api/departments` — department list with counts

All employee/department routes need you to be logged in.

## A few honest notes

Things I know are missing or could be better — didn't want to pretend this is 100% finished:

- No CSRF protection yet, relying on SameSite cookies for now
- No role-based access — any logged in user can edit/delete any employee
- Refresh token is issued on login but there's no `/refresh` endpoint to actually use it yet, so you just have to log in again after the access token expires (24h)
- No automated tests
- UI doesn't have pagination controls even though the backend supports it — currently just loads up to 100 employees at once
- `/api/cache/stats` and `/api/cache/clear` routes aren't behind auth, should fix that

## What I'd add next

- Proper role-based permissions (admin vs regular user)
- Pagination in the UI
- Password reset flow
- Basic test coverage

---

Made for practice/assignment purposes.
