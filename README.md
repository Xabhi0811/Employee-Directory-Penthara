# Employee Directory

A full-stack employee directory: browse employees by department, search across the whole
organisation, and create, edit or delete employee records. Access is gated behind
email/password authentication using JWTs delivered in HttpOnly cookies.

Stack: **React 18 + Vite + Tailwind CSS** on the frontend, **Express 4 + Mongoose 8 +
MongoDB** on the backend, with a **shared Zod schema** so both sides validate against
identical rules.

---

## Table of contents

- [Assignment objective](#assignment-objective)
- [Features](#features)
- [User flows](#user-flows)
- [UI / UX](#ui--ux)
- [Light / Dark mode](#light--dark-mode)
- [Authentication](#authentication)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Frontend architecture](#frontend-architecture)
- [Backend architecture](#backend-architecture)
- [API endpoints](#api-endpoints)
- [MongoDB schema](#mongodb-schema)
- [Search implementation](#search-implementation)
- [Department flow](#department-flow)
- [Employee details](#employee-details)
- [Add / Edit / Delete](#add--edit--delete)
- [Fresher / Experienced logic](#fresher--experienced-logic)
- [Validation](#validation)
- [Security](#security)
- [Error handling](#error-handling)
- [Environment variables](#environment-variables)
- [Installation](#installation)
- [Local development](#local-development)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Performance considerations](#performance-considerations)
- [Accessibility](#accessibility)
- [Architectural decisions](#architectural-decisions)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Assignment objective

Build an employee directory where employees are organised by department and can be
searched, viewed and managed through a full CRUD interface. The directory distinguishes
between **Fresher** and **Experienced** hires, capturing previous-experience details only
for the latter. The whole directory is protected: only authenticated users may read or
modify employee data.

---

## Features

| Feature | Detail |
| --- | --- |
| Department listing | Cards showing every department with a live employee count |
| Department filter | Client-side filter over the loaded department list |
| Global employee search | Server-side MongoDB text search across name, role and department |
| Department drill-down | Per-department employee list with its own in-department search |
| Employee details | Full record view, including previous experience for experienced hires |
| Create employee | Validated form shared by add and edit |
| Edit employee | Same form, pre-populated; partial updates supported |
| Delete employee | Confirmation prompt before deletion |
| Fresher / Experienced | Employment type drives which fields are shown and required |
| Authentication | Signup, login, logout, current-user lookup |
| Route protection | Unauthenticated users are redirected to `/login`; APIs return 401 |
| Light / Dark mode | Token-based theming, persisted, honours system preference |
| Responsive | Mobile-first layout with a floating add button on small screens |

---

## User flows

**First visit (unauthenticated)**

1. Any protected route redirects to `/login`.
2. `/signup` → name, email, password, confirm password → account created → redirected to `/login`.
3. `/login` → email + password → cookies set → redirected to Home (`/`).

**Browsing**

1. Home shows department cards with employee counts.
2. Typing in *Search Employees* switches the page to global employee results.
3. Typing in *Filter Departments* narrows the department cards.
4. Clicking a department card → `/departments/:departmentName`.
5. Clicking an employee → `/employees/:id`.

**Managing**

1. *Add Employee* (navbar, or floating button on mobile) → `/add` → submit → back to Home.
2. *Edit* on a card → `/edit/:id` → submit → back.
3. *Delete* on a card → confirm → record removed, caches invalidated.

**Leaving**

Navbar avatar → dropdown → **Logout** → cookies cleared → redirected to `/login`.

---

## UI / UX

- Tailwind utility classes plus a small set of semantic component classes
  (`.btn`, `.input`, `.card`, `.badge`, `.link-accent`) defined in `frontend/src/index.css`.
- Consistent control heights (42px standard, 36px `.btn-sm`), a single card radius
  (`--radius-card: 10px`) and restrained shadows.
- Green is the primary/action colour, coral marks destructive actions.
- Loading, empty, error and unauthorised states are all handled explicitly:
  spinners and skeletons in `LoadingFallback.jsx`, `.empty-state` blocks for no results,
  toast notifications via `react-hot-toast`.

### Colour tokens

| Token | Light | Purpose |
| --- | --- | --- |
| `--color-primary` | `#107C41` | Primary buttons, links, key actions |
| `--color-primary-subtle` | `#DCF1E7` | Selected / active backgrounds |
| `--color-accent` | `#2CA873` | Active navigation, icons, highlights |
| `--color-danger` | `#E47D51` | Destructive actions (Delete) |
| `--color-bg-base` | `#F4F5F7` | Page background |
| `--color-text-primary` | `#333333` | Primary text |
| `--color-text-secondary` | `#73787D` | Secondary text, placeholders |

---

## Light / Dark mode

`frontend/src/hooks/useTheme.js` owns the theme:

- Reads `localStorage['employee-directory-theme']` first, then falls back to
  `prefers-color-scheme`.
- Toggles a `dark` class on `<html>`; every colour is a CSS variable redefined under
  `:root.dark`, so no component needs `dark:` variants for colour.
- Dark mode is re-toned rather than inverted: surfaces are deep neutral slate (never pure
  black), and the brand green lifts to `#2CA873` so it keeps contrast.
- Transitions are limited to `background-color`, `border-color`, `color`, `fill`, `stroke`
  and `box-shadow` at 240ms. Layout and size are never animated.
  `prefers-reduced-motion: reduce` collapses transitions and animations to ~0.

---

## Authentication

JWT in HttpOnly cookies — tokens are never exposed to JavaScript and are never placed in
`localStorage` or `sessionStorage`.

**Signup** → `POST /api/auth/signup`. Email normalised and checked for uniqueness; password
hashed with bcrypt (12 salt rounds) in a Mongoose `pre('save')` hook. Responds `201`;
the client then redirects to login.

**Login** → `POST /api/auth/login`. `bcrypt.compare` against the stored hash, then two
tokens are issued and set as cookies:

| Cookie | Signed with | Lifetime |
| --- | --- | --- |
| `accessToken` | `JWT_SECRET` | `JWT_EXPIRES_IN` (default 24h) |
| `refreshToken` | `REFRESH_TOKEN_SECRET` | `REFRESH_TOKEN_EXPIRES_IN` (default 7d) |

Cookie flags: `httpOnly: true` always; `secure` and `sameSite: 'strict'` in production
(`sameSite: 'lax'` in development so the Vite dev server on another port still works).

**Request authentication** → `backend/src/middlewares/auth.middleware.js` reads
`accessToken` from the cookie (falling back to an `Authorization: Bearer` header), verifies
it, loads the user with `passwordHash` excluded, and attaches `req.user` / `req.userId`.
Missing or invalid tokens produce `401`.

**Logout** → `POST /api/auth/logout` clears both cookies.

**Frontend guarding** → `ProtectedRoute.jsx` shows a spinner while the boot-time
`GET /api/auth/me` is in flight, then either renders the page or redirects to `/login`,
preserving the attempted location. Login and Signup redirect to Home when already
authenticated.

---

## Architecture

```
Browser
  │  React 18 · React Router · Context API · Axios (withCredentials)
  ▼
Express 4
  requestSecurity → compression → helmet → cors → cookie-parser → body parsers
  → sanitization → rate limiting → request logging
  → routes (auth · employees · departments)
  → controller → service → repository → Mongoose
  ▼
MongoDB
```

The `shared/` directory holds the Zod schema and constants imported by **both** sides, so a
validation rule is defined exactly once.

---

## Folder structure

```
Employee Directory/
├── README.md
├── backend/
│   ├── .env.example
│   ├── jest.config.js
│   ├── package.json
│   ├── logs/                        # runtime logs (gitignored)
│   ├── scripts/
│   │   └── drop-old-text-index.js   # one-off index migration, run manually
│   ├── shared/                      # re-export shims → workspace-level shared/
│   ├── src/
│   │   ├── app.js                   # Express app assembly + middleware order
│   │   ├── server.js                # env validation, DB connect, graceful shutdown
│   │   ├── config/                  # db, security config, seed
│   │   ├── controllers/             # auth, employee, health
│   │   ├── dtos/                    # request/response shaping
│   │   ├── middlewares/             # auth, cache, errors, rate limit, sanitization…
│   │   ├── models/                  # Employee, User
│   │   ├── repositories/            # Mongoose data access
│   │   ├── routes/                  # auth, employee, department
│   │   ├── services/                # business logic
│   │   ├── utils/                   # apiResponse, cache, jwt, logger
│   │   └── validators/              # auth (express-validator), employee (Zod)
│   └── tests/
│       ├── setup.js
│       ├── integration/             # 6 suites
│       └── unit/                    # 8 suites
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js           # brand green + coral palettes
│   ├── vite.config.js               # build: terser, chunking, gzip + brotli
│   ├── vitest.config.js             # test config (no build plugins)
│   └── src/
│       ├── App.jsx                  # routing, providers, public vs protected
│       ├── main.jsx
│       ├── index.css                # theme tokens + component classes
│       ├── components/
│       ├── constants/api.constants.js
│       ├── context/                 # Auth* and Employee* contexts
│       ├── hooks/                   # useDebounce, useTheme
│       ├── pages/
│       ├── services/                # axios instance, employee + auth services
│       ├── test/                    # setup + form helpers
│       └── utils/validation.js
└── shared/
    ├── package.json                 # declares zod (resolution target)
    ├── constants/                   # http + validation constants
    └── schemas/employee.schema.js   # single source of validation truth
```

---

## Frontend architecture

### React components

| Component | Responsibility |
| --- | --- |
| `Navbar` | Logo, nav links, theme toggle, user menu with logout. Hidden on `/login` and `/signup` |
| `ProtectedRoute` | Auth guard; spinner while checking, redirect when unauthenticated |
| `DepartmentList` / `DepartmentCard` | Department cards with counts, loading/empty/error states |
| `EmployeeList` / `EmployeeCard` | Employee grid; card links to details and hosts Edit/Delete |
| `EmployeeSearchResults` | Compact result rows for global search |
| `EmployeeForm` | Shared add/edit form; drives fields from the Zod schema |
| `SearchInput` | Labelled, debounced search box |
| `LoadingFallback` | `PageLoadingFallback`, `ComponentLoadingFallback`, card/list skeletons |
| `ErrorBoundary` | Catches render errors, offers Try Again / Go Home |

Pages: `Home`, `DepartmentEmployees`, `EmployeeDetails`, `AddEmployee`, `EditEmployee`,
`Login`, `Signup` — all lazy-loaded via a `lazyRoute` helper that recovers from stale
chunk errors after a redeploy with a single guarded reload.

### Context API

State is split into **data** and **actions** contexts so that calling an action does not
re-render consumers that only read data:

- `EmployeeDataContext` — `employees`, `departments`, `departmentSummaries`, plus separate
  `loading` / `departmentsLoading` and `error` / `departmentsError` flags.
- `EmployeeActionsContext` — `fetchEmployees`, `fetchEmployee`, `fetchDepartments`,
  `fetchDepartmentSummaries`, `addEmployee`, `editEmployee`, `removeEmployee`. Actions are
  `useCallback`-stable and de-duplicate in-flight requests via a `useRef` map.
- `AuthDataContext` — `user`, `isAuthenticated`, `loading`, `error`.
- `AuthActionsContext` — `checkAuth`, `signup`, `login`, `logout`, `clearError`.
- `EmployeeContext` / `AuthContext` compose the pair and expose combined
  `useEmployeeContext()` / `useAuth()` hooks.

### Service layer

`services/api.js` is a single Axios instance with `withCredentials: true`, a 10s timeout,
GET request de-duplication, and a response interceptor that normalises error messages
(including 401). `employeeService.js` and `authService.js` wrap the endpoints; components
never call Axios directly.

---

## Backend architecture

Layered: **route → validator/middleware → controller → service → repository → model**.

- **Controllers** translate HTTP to/from the service layer and emit responses through
  `sendSuccess` / `sendError`.
- **Services** hold business logic: pagination clamping, search sanitisation, sort-field
  whitelisting, duplicate-email checks, DTO mapping, and mapping failures to status codes.
- **Repositories** own all Mongoose queries and always filter `isActive`/`isArchived`.
- **DTOs** shape input and output — notably, previous-experience fields are only included
  for `Experienced` employees.

Middleware order in `app.js` matters and is numbered in the source: request security →
compression → helmet → CORS → cookie-parser → body parsers → body-parser error handler →
sanitisation → global rate limit → request logging → health routes → API routes → 404 →
error handler.

All responses share one envelope:

```json
{ "success": true, "message": "…", "data": {}, "meta": {} }
```

```json
{ "success": false, "message": "…", "errors": [] }
```

---

## API endpoints

Base URL: `http://localhost:5000`. Everything under `/api/employees` and
`/api/departments` requires authentication.

### Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | Public | `{ name, email, password, confirmPassword }` → `201`; `409` on duplicate email |
| POST | `/api/auth/login` | Public | `{ email, password }` → `200` + cookies; `401` on bad credentials |
| POST | `/api/auth/logout` | Required | Clears cookies |
| GET | `/api/auth/me` | Required | Current user without `passwordHash` |
| GET | `/api/auth/status` | Optional | `{ authenticated: boolean, user? }` |

Signup and login are rate limited to 5 attempts per 15 minutes per IP.

### Employees

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/employees` | Query: `search`, `department`, `page`, `limit`, `sortBy`, `order`. Returns `meta.pagination` |
| GET | `/api/employees/:id` | Single employee |
| GET | `/api/employees/departments/list` | Distinct department names |
| POST | `/api/employees` | Create — Zod validated, mass-assignment protected |
| PUT | `/api/employees/:id` | Update — partial Zod schema |
| DELETE | `/api/employees/:id` | Delete |

`sortBy` is whitelisted to `name`, `role`, `department`, `email`, `joiningDate`,
`createdAt`; anything else falls back to `createdAt`. `limit` is clamped to 1–100
(default 10), `page` to ≥ 1.

### Departments

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/departments` | Departments with live employee counts |

### Health (public)

`GET /health`, `GET /ready`, `GET /live`.

### Cache utilities

`GET /api/cache/stats`, `POST /api/cache/clear` — operational helpers for the in-memory cache.

---

## MongoDB schema

### Employee (`employees`)

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–100, indexed |
| `role` | String | required, 2–100 |
| `department` | String | required, 2–100, indexed |
| `email` | String | required, unique, lowercase, format-validated |
| `phone` | String | required, `/^\+?[\d\s\-()]{10,20}$/` |
| `joiningDate` | Date | required, cannot be in the future, indexed |
| `employmentType` | String | required, `Fresher` \| `Experienced`, indexed |
| `yearsOfExperience` | Number | required when Experienced, 0–50 |
| `previousOrganization` | String | required when Experienced, ≤ 100 |
| `previousRole` | String | required when Experienced, ≤ 100 |
| `previousExperienceDescription` | String | required when Experienced, 10–1000 |
| `isActive` | Boolean | default `true` — soft delete flag, never sent to clients |
| `isArchived` | Boolean | default `false` — never sent to clients |
| `createdAt` / `updatedAt` | Date | automatic timestamps |

Indexes: weighted text index `employee_text_search` (name 10, department 5, role 3),
`active_department_created`, `pagination_default`, `joining_date_sort`, and a unique
`email_unique`. `toJSON` maps `_id` → `id` and strips `__v`, `isActive`, `isArchived`.

Instance helpers `softDelete()`, `archive()`, `restore()` and statics `findActive()`,
`countActive()`, `findPaginated()`, `bulkCreate()` exist on the model; the delete endpoint
currently performs a hard delete through the repository.

### User (`users`)

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–100 |
| `email` | String | required, unique, lowercase, format-validated |
| `passwordHash` | String | required, bcrypt, `select: false` |
| `createdAt` / `updatedAt` | Date | automatic timestamps |

`passwordHash` is excluded by default, deleted in `toJSON`, and stripped again by
`toSafeObject()` — so it cannot reach a response.

---

## Search implementation

**Global search** (Home) hits the API. The service sanitises the term
(`/[^a-zA-Z0-9\s]/` removed, trimmed, capped at 100 chars) and issues a MongoDB
`$text` search against the weighted index. Regex is deliberately avoided here to remove any
ReDoS exposure. Results are additionally filtered client-side on name/role/department so a
department-name query behaves as users expect.

**Department filter** (Home) is pure client-side filtering over the already-loaded
department summaries — no request per keystroke.

**In-department search** (`/departments/:departmentName`) filters that department's list.

All search inputs debounce at 300ms via `useDebounce`.

---

## Department flow

Departments are **not** a separate collection — they are a field on the employee document,
so the department list is derived. `GET /api/departments` aggregates live counts and
`GET /api/employees/departments/list` returns distinct names for filter controls. Both
responses are cached in memory, and every employee mutation invalidates the `employees` and
`departments` caches so counts never go stale after an add, edit or delete.

---

## Employee details

`/employees/:id` renders the full record: name, role, department, email (mailto) and phone
(tel) links, joining date, and the employment-type badge. For an `Experienced` employee it
additionally renders years of experience, previous organisation, previous role and the
experience description. A fresher's page omits that block entirely, because the API does
not return those fields for freshers.

---

## Add / Edit / Delete

`EmployeeForm` backs both add and edit. It validates against the shared Zod schema on
submit, marks fields touched on blur, and surfaces one message per field.

- **Add** — `POST /api/employees`, then navigate Home.
- **Edit** — loads the employee, pre-fills the form, sends `PUT`. The update path uses the
  partial schema so untouched fields are left alone.
- **Delete** — `window.confirm` guard, then `DELETE`, then cache invalidation.

Write operations are rate limited to 30 per 15 minutes per IP and pass through
mass-assignment protection.

---

## Fresher / Experienced logic

`employmentType` is the switch:

- **Fresher** — previous-experience fields are hidden in the form, not required by the
  schema, left `undefined` in Mongo (never empty strings), and omitted from API responses.
- **Experienced** — `yearsOfExperience` (0–50), `previousOrganization` (≥ 2),
  `previousRole` (≥ 2) and `previousExperienceDescription` (≥ 10) all become required.

The rules live in one place: `withEmploymentRules()` in `shared/schemas/employee.schema.js`
applies a `superRefine` that only fires when `employmentType === 'Experienced'`. The same
function wraps both the create schema and the partial update schema, so a partial update
that doesn't touch `employmentType` is unaffected. The Mongoose model mirrors the rules with
function-valued `required`, and switching an employee back to `Fresher` makes the service
remove (`$unset`) the stale experience fields rather than blanking them.

---

## Validation

Three layers, all agreeing because they share constants:

1. **Client** — `utils/validation.js` calls `validateEmployeeData()` from the shared schema.
2. **API** — `validators/employee.validator.js` parses the body with the shared Zod schema
   and returns `400` with `{ field, message }` pairs. Auth routes use `express-validator`.
3. **Database** — Mongoose schema validators as the final backstop.

Password policy (signup): ≥ 8 characters with at least one lowercase, one uppercase, one
digit and one special character, plus a confirm-password match.

---

## Security

| Measure | Implementation |
| --- | --- |
| Password hashing | bcrypt, 12 salt rounds, in a `pre('save')` hook |
| Token storage | JWT in HttpOnly cookies; never in `localStorage`/`sessionStorage` |
| Cookie hardening | `secure` + `SameSite=Strict` in production |
| Route protection | `authenticate` middleware on all employee/department routes → `401` |
| Generic auth errors | "Invalid email or password" regardless of which part was wrong |
| Secret management | `JWT_SECRET` / `REFRESH_TOKEN_SECRET` from env, nothing hard-coded |
| Rate limiting | Global 100/15min, writes 30/15min, auth 5/15min |
| Security headers | Helmet with CSP, HSTS, `frameguard: deny`, `noSniff`, referrer policy |
| CORS | Origin whitelist with `credentials: true` |
| Request size limits | 100kb JSON and urlencoded, 50-parameter cap |
| Request timeout | 30s |
| NoSQL injection | `express-mongo-sanitize` plus a custom sanitiser removing `$`/dotted keys |
| Prototype pollution | `__proto__`, `constructor`, `prototype` keys stripped |
| XSS | Tag/`javascript:`/event-handler stripping on input |
| HTTP parameter pollution | `hpp` |
| Mass assignment | Field whitelists; `_id`, `__v`, timestamps, `isActive`, `isArchived` rejected |
| ReDoS | Text search instead of regex; search terms sanitised and length-capped |
| Sensitive data | `passwordHash` excluded by query, `toJSON` and `toSafeObject()` |
| Logging hygiene | Passwords and tokens are never logged |

---

## Error handling

- **Backend** — controllers delegate to `errorHandler.js`, which maps Mongoose
  `ValidationError` → 400, `CastError` → 400 (invalid id), duplicate key `11000` → 409,
  malformed JSON → 400, and everything else to its `statusCode` or 500. Stack traces are
  only included when `NODE_ENV=development`. `notFoundHandler` covers unmatched routes.
- **Frontend** — the Axios interceptor normalises messages; context actions catch, set
  `error` state and raise a toast; `ErrorBoundary` catches render-time failures; lazy route
  loading has a stale-chunk recovery path.
- **Logging** — Winston writes `logs/error.log` and `logs/combined.log`, and is silent when
  `NODE_ENV=test`.

---

## Environment variables

Copy the examples and fill them in — real `.env` files are gitignored and must never be
committed.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Server port (**required**) |
| `NODE_ENV` | `development` | Drives cookie flags, logging, write concern |
| `MONGO_URI` | `mongodb://localhost:27017/employee-directory` | Connection string (**required**) |
| `JWT_SECRET` | — | Access-token signing secret |
| `JWT_EXPIRES_IN` | `24h` | Access-token lifetime |
| `REFRESH_TOKEN_SECRET` | — | Refresh-token signing secret |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh-token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Client origin |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS whitelist |
| `RATE_LIMIT_WHITELIST` | empty | IPs exempt from rate limiting |
| `MAX_JSON_SIZE` / `MAX_URLENCODED_SIZE` | `100kb` | Body size caps |
| `MAX_PARAMETER_COUNT` | `50` | Parameter cap |
| `REQUEST_TIMEOUT_MS` | `30000` | Request timeout |
| `FORCE_HTTPS` | `false` | Set `true` behind TLS |
| `CACHE_*`, `EMPLOYEE_CACHE_*`, `DEPARTMENT_CACHE_*` | see example | In-memory cache sizes and TTLs |
| `MONITOR_DB_POOL` / `DB_POOL_MONITOR_INTERVAL` | `false` / `60000` | Connection-pool logging |

`server.js` refuses to boot without `MONGO_URI` and `PORT`. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `frontend/.env`

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL (**required** — the app throws at import time without it) |

---

## Installation

Prerequisites: **Node.js 18+** (the code uses native `fetch` and ESM) and a running
**MongoDB** instance.

```bash
# 1. shared module — installs zod, which the shared schema resolves against
cd shared && npm install

# 2. backend
cd ../backend && npm install

# 3. frontend
cd ../frontend && npm install
```

> Install `shared/` first. `shared/schemas/employee.schema.js` imports `zod` and Node
> resolves it from `shared/node_modules`; the backend and frontend do not and cannot
> supply it.

Optionally seed sample employees:

```bash
cd backend && npm run seed
```

---

## Local development

Two terminals:

```bash
# terminal 1
cd backend && npm run dev     # http://localhost:5000

# terminal 2
cd frontend && npm run dev    # http://localhost:5173
```

Then open http://localhost:5173, create an account at `/signup`, and log in.

### Scripts

| Location | Script | Does |
| --- | --- | --- |
| backend | `npm start` | Production server |
| backend | `npm run dev` | Server with `--watch` |
| backend | `npm run seed` | Seed sample employees |
| backend | `npm test` | Jest suite |
| backend | `npm run test:unit` / `test:integration` | Subset |
| backend | `npm run test:coverage` | Coverage (70% threshold) |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build |
| frontend | `npm run preview` | Serve the build |
| frontend | `npm test` | Vitest once |
| frontend | `npm run test:coverage` | Coverage |

---

## Testing

**Backend** — Jest with `mongodb-memory-server` (no real database needed) and Supertest for
HTTP. ESM requires `--experimental-vm-modules`, already wired into `npm test`.
14 suites: 8 unit (model, repository, service, cache, error handler, mass assignment,
request security, sanitisation) and 6 integration (auth routes, employee routes, department
routes, employment type, rate limiting, db config).

**Frontend** — Vitest + Testing Library in jsdom. 11 suites covering EmployeeCard,
EmployeeForm, EmployeeList, ProtectedRoute, and the Home, AddEmployee, EditEmployee,
EmployeeDetails, DepartmentEmployees, Login and Signup pages.

```bash
cd backend  && npm test
cd frontend && npm test
```

Integration tests whitelist the loopback address so the shared rate-limiter store doesn't
make runs order-dependent, and clear the response caches between tests.

See [Known limitations](#known-limitations) for the currently failing suites.

---

## Production build

```bash
cd frontend && npm run build   # → frontend/dist
```

Vite emits hashed assets under `dist/assets`, code-split per route, minified with terser
(`console.*` and `debugger` dropped), plus `.gz` and `.br` variants for anything over 1KB.
Vendor code is split into `react-vendor`, `utils-vendor` and `vendor` chunks for long-term
caching. Current output is roughly 235KB of JS and 32KB of CSS before compression.

The backend needs no build step — run `npm start`.

---

## Deployment

1. Provision MongoDB (Atlas or self-hosted) and set `MONGO_URI`.
2. Set `NODE_ENV=production`, which turns on `secure` + `SameSite=Strict` cookies, majority
   write concern and journaling, and disables automatic index creation.
3. Set strong, unique `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.
4. Set `ALLOWED_ORIGINS` (and `CLIENT_URL`) to the deployed frontend origin — CORS uses a
   strict whitelist and credentialed requests will fail otherwise.
5. Serve the API over HTTPS. `secure` cookies are not sent over plain HTTP, so login will
   appear to succeed and then fail on the next request.
6. Build the frontend with `VITE_API_URL` pointing at the deployed API and serve `dist/`
   from any static host, with SPA fallback rewriting unknown paths to `index.html`.
7. Point your process manager or orchestrator at `/health`, `/ready`, `/live`.
8. If an older deployment created the legacy `name_text_department_text` index, run
   `node scripts/drop-old-text-index.js` once; the current index is recreated on boot.

---

## Performance considerations

**Backend**

- Connection pool 5–50 with tuned timeouts, zlib compression, `primaryPreferred` reads.
- In-memory LRU caches with TTL: employees 5min, departments 10min, invalidated on write.
- HTTP caching with `Cache-Control` and ETag support for conditional GETs.
- Parallel query + count via `Promise.all`; `.lean()` reads; selective projection.
- Indexes covering search, department filtering, pagination and sorting.
- gzip/deflate response compression above 1KB.

**Frontend**

- Route-level code splitting with `React.lazy` and skeleton fallbacks.
- Data and action contexts split so actions don't re-render data consumers.
- `memo` on list/card components, `useCallback`/`useMemo` on hot paths.
- 300ms debounced search inputs.
- In-flight request de-duplication in both the Axios layer and the actions context.
- Build-time minification, chunking, and gzip + brotli precompression.

**Deliberately not done:** no speculative refactoring. Caching, memoisation and indexing
strategies were left exactly as implemented.

---

## Accessibility

- Semantic landmarks, `role="article"` on cards, `role="search"` on search regions.
- Every input has a `<label>`; errors are linked with `aria-describedby` and
  `aria-invalid`.
- Live regions (`aria-live="polite"`, `role="status"`) announce result counts and loading.
- Skip-to-main-content link as the first focusable element.
- Visible focus rings via `:focus-visible` with a theme-aware offset colour.
- Descriptive labels on icon-only controls; decorative SVGs are `aria-hidden`.
- `prefers-reduced-motion` respected.
- Contrast: primary green on white 5.3:1; in dark mode 5.5:1. The Delete button keeps
  `#E47D51` but uses a deep coral-brown label (4.9:1) because white on that coral is only
  2.9:1, and it lightens rather than darkens on hover to preserve contrast. Secondary text
  `#73787D` on `#F4F5F7` is 4.0:1 — slightly under AA for body copy, kept because it is the
  specified palette value.

Full WCAG conformance would still need manual testing with real assistive technology.

---

## Architectural decisions

**Departments derived, not stored.** A department is a field on the employee document. This
keeps writes single-document and consistent, at the cost of aggregating for counts — which
the cache absorbs.

**One shared validation schema.** Zod lives in `shared/` and is imported by client, API and
(mirrored in) the model, so rules cannot drift between layers.

**`backend/shared/` is a shim, not a copy.** Backend modules import via `../../shared/…`
while the request validator and frontend use the workspace-level `shared/`. Both locations
once held full copies that silently diverged; `backend/shared/*` now just re-exports the
canonical files, so existing import paths keep working with one source of truth.

**Split data/action contexts.** Avoids the classic single-context problem where any state
change re-renders every consumer.

**Cookies over `localStorage`.** HttpOnly cookies keep tokens away from JavaScript, which
removes token theft via XSS as a class of attack. The cost is CSRF exposure, mitigated with
`SameSite`.

**CSS variables for theming.** One token set, redefined under `:root.dark`. Components
reference semantic classes, so a palette change touches one file.

**Text search over regex.** Regex search on user input is a ReDoS risk; the weighted text
index is both safer and faster.

**Separate `vitest.config.js`.** Keeps terser and compression plugins out of test runs.

---

## Known limitations

- **Pre-existing test failures — 91 total.** Introducing authentication made the older
  suites fail because they call protected endpoints without credentials, and the auth UI
  suites fail on a loading-state issue. Neither is caused by cleanup; both predate it.
  - *Backend: 62 failing of 246.* `employee.routes`, `department.routes`, `employmentType`
    and part of `auth.routes` call `/api/employees` and `/api/departments` without an auth
    cookie and receive `401` instead of the expected status. Fix: sign up + log in in
    `beforeEach` and attach the cookie with `.set('Cookie', authCookies)`.
    `employee.routes.test.js` already has that helper wired as a reference.
  - *Frontend: 29 failing of 133.* `AuthDataContext` initialises `loading: true` for the
    boot-time auth check, and Login/Signup reuse that same flag for their submit buttons —
    so the buttons render as "Signing in…"/"Creating account…" and disabled until
    `/api/auth/me` resolves. In tests the mocked call never resolves, so queries for the
    button fail; `ProtectedRoute` stays on its spinner for the same reason. In the browser
    it self-corrects once `/me` returns, so it shows as a brief flash. Fix: separate the
    boot-check flag from a per-form `submitting` flag.
- **Refresh token is issued but not consumed.** No `/api/auth/refresh` endpoint exists, so
  an expired access token means logging in again.
- **No RBAC.** Every authenticated user has identical permissions.
- **Delete is hard delete.** `softDelete()`/`archive()`/`restore()` exist on the model and
  the repository filters on the flags, but the delete endpoint removes the document.
- **Caches and rate-limit counters are in-process.** Multiple instances each keep their own,
  so limits are effectively per-instance. Redis would be needed to share them.
- **Global search does a second client-side filter**, so results are bounded by the page
  size the API returned.
- **No CSRF token.** Protection relies on `SameSite` cookies plus the CORS whitelist.
- **No E2E tests** and no linter configured — there is no ESLint/Prettier setup, so
  "lint/type checks" are not part of verification.
- **The project is not its own git repository.** The enclosing git root is the user's home
  directory, so `git status`/`git diff` here report unrelated files.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ERR_CONNECTION_REFUSED` on login/signup | Backend isn't running. Start `cd backend && npm run dev` |
| `Missing required environment variables` on boot | No `backend/.env`. Copy `.env.example` and set `MONGO_URI` + `PORT` |
| `VITE_API_URL environment variable is not configured` | No `frontend/.env`. Set `VITE_API_URL=http://localhost:5000/api` |
| `EADDRINUSE :::5000` | A previous server is still bound. Kill the process holding the port |
| `MongoDB Connection Error` / retries then exit | MongoDB isn't reachable. Confirm it's running and `MONGO_URI` is correct (retries 5× at 5s) |
| `Cannot find package 'zod'` | `shared/` was never installed. `cd shared && npm install` |
| Every API call returns 401 | Not logged in, or the cookie was dropped. In production `secure` cookies require HTTPS; check `ALLOWED_ORIGINS` includes the exact frontend origin |
| Login succeeds, next request is 401 | Cookie not stored — usually `secure` cookies over plain HTTP, or a cross-origin mismatch |
| `Not allowed by CORS` | Frontend origin missing from `ALLOWED_ORIGINS` |
| `429 Too many requests` | Rate limit hit (auth 5/15min). Wait, or add your IP to `RATE_LIMIT_WHITELIST` in development |
| Department counts look stale | Caches invalidate on write; `POST /api/cache/clear` forces a flush |
| Duplicate schema index warning on boot | `email` is declared both inline and via `schema.index()`; harmless, cosmetic |
| Blank page after redeploy | Stale lazy chunk. The app self-reloads once; hard-refresh if it persists |

---

## Licence

ISC
