# Employee Directory

A full-stack employee directory. Browse employees grouped by department, search the whole
organisation by name/role/department, and create, edit or delete employee records. The
entire directory sits behind email/password authentication using JWTs delivered in HttpOnly
cookies.

**Stack**

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, react-hot-toast |
| Backend | Node.js 18+, Express 4, Mongoose 8, JWT (`jsonwebtoken`), bcryptjs, Winston |
| Database | MongoDB (local `mongod` or MongoDB Atlas) |
| Validation | Zod schema in `shared/`, imported by both frontend and backend |
| Tests | Jest + Supertest + mongodb-memory-server (backend), Vitest + Testing Library (frontend) |

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [API endpoints](#api-endpoints)
- [Data models](#data-models)
- [Validation](#validation)
- [Authentication](#authentication)
- [Security](#security)
- [Caching and data freshness](#caching-and-data-freshness)
- [Search](#search)
- [UI / UX](#ui--ux)
- [Performance](#performance)
- [Scripts](#scripts)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Detail |
| --- | --- |
| Department cards | Home lists every department with a live headcount from the database |
| Department filter | Client-side filter over the already-loaded department list |
| Global employee search | MongoDB weighted text search across name, role and department |
| Department drill-down | `/departments/:departmentName` with its own in-department search |
| Employee details | Full record; previous-experience block only for `Experienced` hires |
| Add / Edit employee | One shared form validated against the shared Zod schema |
| Delete employee | Confirmation prompt, then removal |
| Fresher / Experienced | Employment type decides which fields are shown and required |
| Authentication | Signup, login, logout, current-user lookup, status check |
| Route protection | Unauthenticated users redirect to `/login`; protected APIs return `401` |
| Light / dark mode | CSS-variable theming, persisted, honours system preference |
| Responsive | Mobile-first, floating add button on small screens |

---

## Quick start

Prerequisites: **Node.js 18+** and a reachable **MongoDB** (local or Atlas).

### 1. Install dependencies

Install `shared/` **first** — `shared/schemas/employee.schema.js` imports `zod` and Node
resolves it from `shared/node_modules`.

```bash
cd shared && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then edit `backend/.env` and set at minimum `MONGO_URI`, `JWT_SECRET` and
`REFRESH_TOKEN_SECRET`. Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Start MongoDB

Local:

```bash
mongod --dbpath /path/to/your/data
```

Or point `MONGO_URI` at MongoDB Atlas — no code changes needed, the connection layer is
URI-agnostic. With Atlas you must allowlist your IP in the Atlas dashboard and URL-encode
any special characters in the password.

Optionally seed sample employees:

```bash
cd backend && npm run seed
```

### 4. Start the backend (terminal 1)

```bash
cd backend && npm run dev      # http://localhost:5000
```

### 5. Start the frontend (terminal 2)

```bash
cd frontend && npm run dev     # http://localhost:5173
```

Vite opens the browser automatically. Create an account at `/signup`, then log in.

---

## Environment variables

Real `.env` files are gitignored and must never be committed. Only `.env.example` is
tracked.

### `backend/.env`

| Variable | Example / default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Server port (**required** — `server.js` refuses to boot without it) |
| `NODE_ENV` | `development` | Drives Mongoose debug logging, write concern, journaling, auto-index |
| `MONGO_URI` | `mongodb://localhost:27017/employee-directory` or an Atlas `mongodb+srv://…` URI | Connection string (**required**) |
| `JWT_SECRET` | — | Access-token signing secret |
| `JWT_EXPIRES_IN` | `24h` | Access-token lifetime |
| `REFRESH_TOKEN_SECRET` | — | Refresh-token signing secret |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh-token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Client origin. Also decides cookie `secure`/`sameSite` — see [Authentication](#authentication) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated CORS whitelist |
| `RATE_LIMIT_WHITELIST` | empty | Comma-separated IPs exempt from rate limiting (e.g. `127.0.0.1,::1`) |
| `MAX_JSON_SIZE` | `100kb` | JSON body size cap |
| `MAX_URLENCODED_SIZE` | `100kb` | URL-encoded body size cap |
| `MAX_PARAMETER_COUNT` | `50` | Max URL-encoded parameters |
| `REQUEST_TIMEOUT_MS` | `30000` | Per-request timeout |
| `FORCE_HTTPS` | `false` | Set `true` when terminating TLS in front of the API |
| `CACHE_MAX_SIZE` | `104857600` | Global in-memory cache byte budget |
| `CACHE_MAX_ITEMS` | `1000` | Global cache item budget |
| `CACHE_DEFAULT_TTL` | `300000` | Global cache TTL (ms) |
| `EMPLOYEE_CACHE_SIZE` / `_ITEMS` / `_TTL` | `52428800` / `500` / `300000` | Employee cache tuning |
| `DEPARTMENT_CACHE_SIZE` / `_ITEMS` / `_TTL` | `1048576` / `100` / `600000` | Department cache tuning |
| `MONITOR_DB_POOL` | `false` | Log connection-pool stats periodically |
| `DB_POOL_MONITOR_INTERVAL` | `60000` | Pool-log interval (ms) |

### `frontend/.env`

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL. **Required** — `api.constants.js` throws at import time if missing |

`VITE_API_URL` is inlined at build time by Vite, so changing it requires restarting the dev
server (or rebuilding for `npm run build`).

---

## Project structure

```
Employee Directory/
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── jest.config.js
│   ├── package.json
│   ├── logs/                            # Winston output (gitignored)
│   ├── scripts/
│   │   └── drop-old-text-index.js       # one-off index migration, run manually
│   ├── shared/                          # thin re-export shims → workspace shared/
│   ├── src/
│   │   ├── app.js                       # Express assembly + ordered middleware chain
│   │   ├── server.js                    # env validation, DB connect, graceful shutdown
│   │   ├── config/                      # db.js, security.config.js, seed.js
│   │   ├── controllers/                 # auth, employee, health
│   │   ├── dtos/                        # employee.dto.js — request/response shaping
│   │   ├── middlewares/                 # auth, cache, httpCache, errorHandler,
│   │   │                                #   massAssignment, rateLimit, requestLogger,
│   │   │                                #   requestSecurity, sanitization
│   │   ├── models/                      # Employee.js, User.js
│   │   ├── repositories/                # employee.repository.js
│   │   ├── routes/                      # auth, employee, department
│   │   ├── services/                    # auth.service.js, employee.service.js
│   │   ├── utils/                       # apiResponse, cache, jwt.utils, logger
│   │   └── validators/                  # auth (express-validator), employee (Zod)
│   └── tests/
│       ├── setup.js
│       ├── unit/                        # 8 suites
│       └── integration/                 # 6 suites
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js                   # dev server + build/compression config
│   ├── vitest.config.js                 # test config, kept separate from build plugins
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                      # providers, routing, lazy routes, Toaster
│       ├── index.css                    # theme tokens + semantic component classes
│       ├── components/                  # 11 components + 4 colocated test files
│       ├── constants/api.constants.js   # API base URL guard + endpoint map
│       ├── context/                     # 6 files — Auth* and Employee* (data/actions split)
│       ├── hooks/                       # useDebounce.js, useTheme.js
│       ├── pages/                       # 7 pages + 7 colocated test files
│       ├── services/                    # api.js (Axios instance), authService, employeeService
│       ├── test/                        # setup + form helpers
│       └── utils/validation.js
└── shared/
    ├── package.json                     # declares zod (resolution target)
    ├── constants/                       # http.constants.js, validation.constants.js
    └── schemas/employee.schema.js       # single source of validation truth
```

---

## Architecture

```
Browser
  │  React 18 · React Router · Context API · Axios (withCredentials: true)
  ▼
Express 4
  requestSecurity → compression → helmet → cors → cookie-parser → body parsers
  → body-parser error handler → sanitization → global rate limit → request logger
  → health routes → /api/auth · /api/employees · /api/departments
  → 404 handler → global error handler
  ▼
controller → service → repository → Mongoose → MongoDB
```

### Backend layering

**route → validator / middleware → controller → service → repository → model**

- **Controllers** translate HTTP to and from the service layer and emit every response
  through `sendSuccess` / `sendError`.
- **Services** hold business logic: pagination clamping, search sanitisation, sort-field
  whitelisting, duplicate-email checks, DTO mapping, and mapping failures to status codes.
- **Repositories** own all Mongoose queries and always filter on `isActive` / `isArchived`.
- **DTOs** shape input and output — previous-experience fields are only included for
  `Experienced` employees.

Middleware order in `app.js` is numbered in the source (1–10) because it matters: security
and body limits must run before parsing, sanitisation before rate limiting, and both error
handlers must be registered last.

Every response uses one envelope:

```json
{ "success": true,  "message": "…", "data": {}, "meta": {} }
{ "success": false, "message": "…", "errors": [] }
```

### MongoDB connection

`backend/src/config/db.js` connects with a tuned pool and retry loop: `maxPoolSize` 50,
`minPoolSize` 5, `serverSelectionTimeoutMS` 5000, `maxIdleTimeMS` 60000, zlib compression at
level 6, `readPreference: 'primaryPreferred'`, IPv4 only. On failure it retries **5 times at
5-second intervals** before calling `process.exit(1)`.

`NODE_ENV` changes three things: write concern (`majority` in production, `1` otherwise),
journaling (production only), and `autoIndex` (disabled in production). In `development`
Mongoose query debug logging is enabled.

Helpers exported alongside the default connect function: `closeConnection`,
`getConnectionStats` (includes live pool metrics), `isHealthy`, `ping`,
`startPoolMonitoring`.

### Frontend architecture

`App.jsx` composes `ErrorBoundary → Router → AuthProvider → AuthCheck → EmployeeProvider`,
renders `Navbar` and a themed `Toaster`, and wires the routes. `AuthCheck` fires
`checkAuth()` once on mount so the boot-time `GET /api/auth/me` runs before any protected
page tries to load data.

Routes are code-split through a `lazyRoute` helper that catches a failed chunk import,
attempts exactly one guarded reload (`window.chunkLoadErrorHandled`), and otherwise renders
an explicit retry screen instead of a blank page.

| Route | Component | Access |
| --- | --- | --- |
| `/login` | `Login` | Public |
| `/signup` | `Signup` | Public |
| `/` | `Home` | Protected |
| `/departments/:departmentName` | `DepartmentEmployees` | Protected |
| `/employees/:id` | `EmployeeDetails` | Protected |
| `/add` | `AddEmployee` | Protected |
| `/edit/:id` | `EditEmployee` | Protected |

#### Components

| Component | Responsibility |
| --- | --- |
| `Navbar` | Logo, nav links, theme toggle, user menu with logout. Hidden on auth pages |
| `ProtectedRoute` | Auth guard; spinner while the boot check runs, redirect when unauthenticated |
| `DepartmentList` / `DepartmentCard` | Department cards with headcounts, plus loading/empty/error states |
| `EmployeeList` / `EmployeeCard` | Employee grid; card links to details and hosts Edit/Delete |
| `EmployeeSearchResults` | Compact result rows for global search |
| `EmployeeForm` | Shared add/edit form driven by the Zod schema |
| `SearchInput` | Labelled, debounced search box |
| `LoadingFallback` | `PageLoadingFallback`, `ComponentLoadingFallback`, card/list skeletons |
| `ErrorBoundary` | Catches render errors, offers Try Again / Go Home |

#### Context API

State is split into **data** and **actions** contexts so dispatching an action does not
re-render components that only read data.

- `EmployeeDataContext` — `employees`, `departments`, `departmentSummaries`, with separate
  `loading` / `departmentsLoading` and `error` / `departmentsError` flags.
- `EmployeeActionsContext` — `fetchEmployees`, `fetchEmployee`, `fetchDepartments`,
  `fetchDepartmentSummaries`, `addEmployee`, `modifyEmployee`, `removeEmployee`. All are
  `useCallback`-stable and de-duplicate concurrent identical calls through a
  `pendingRequests` `useRef` map. Each mutation updates local employee state and then calls
  `fetchDepartmentSummaries()` so Home headcounts follow the database.
- `AuthDataContext` — `user`, `isAuthenticated`, `loading`, `error`.
- `AuthActionsContext` — `checkAuth`, `signup`, `login`, `logout`, `clearError`.
- `EmployeeContext` / `AuthContext` compose each pair into the combined
  `useEmployeeContext()` and `useAuth()` hooks.

#### Service layer

`services/api.js` is a single Axios instance with `withCredentials: true`, a 10-second
timeout, GET de-duplication, and a response interceptor that normalises error messages
(including `401`). `employeeService.js` and `authService.js` wrap the endpoints — components
never call Axios directly.

---

## API endpoints

Base URL: `http://localhost:5000`. Every route under `/api/employees` and
`/api/departments` calls `router.use(authenticate)` — a missing or invalid cookie yields
`401`.

### Auth — `/api/auth`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/signup` | Public | `{ name, email, password, confirmPassword }` → `201`. `409` on duplicate email. Rate limited 5/15min |
| POST | `/login` | Public | `{ email, password }` → `200` + both cookies. `401` on bad credentials. Rate limited 5/15min |
| POST | `/logout` | Required | Clears both cookies |
| GET | `/me` | Required | Current user, `passwordHash` excluded |
| GET | `/status` | Optional | `{ authenticated: boolean, user? }` — never throws |

### Employees — `/api/employees`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Query: `search`, `department`, `page`, `limit`, `sortBy`, `order`. Returns `meta.pagination` |
| GET | `/:id` | Single employee |
| GET | `/departments/list` | Distinct department names, used to populate filter controls |
| POST | `/` | Create. Zod-validated, mass-assignment protected, rate limited 30/15min |
| PUT | `/:id` | Update with the partial Zod schema. Rate limited 30/15min |
| DELETE | `/:id` | Hard delete. Rate limited 30/15min |

`sortBy` is whitelisted to `name`, `role`, `department`, `email`, `joiningDate`,
`createdAt`; anything else falls back to `createdAt`. `limit` is clamped to 1–100 with a
**default of 10**, and `page` to ≥ 1.

### Departments — `/api/departments`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Every department with its live employee count |

Departments are **derived**, not stored — there is no departments collection. This route is
served by the employee controller aggregating over employee documents, which is why the
headcounts are always authoritative.

### Operational routes (no authentication)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Overall health |
| GET | `/ready` | Readiness — checks the database connection |
| GET | `/live` | Liveness |
| GET | `/api/cache/stats` | In-memory cache statistics |
| POST | `/api/cache/clear` | Flush the in-memory caches |

These are registered before the API routers and are intentionally unauthenticated so a
process manager can probe them. See [Known limitations](#known-limitations) regarding the
cache routes.

---

## Data models

### Employee — collection `employees`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–100, trimmed, indexed |
| `role` | String | required, 2–100, trimmed |
| `department` | String | required, 2–100, trimmed, indexed |
| `email` | String | required, unique, lowercased, regex-validated, indexed |
| `phone` | String | required, `/^\+?[\d\s\-()]{10,20}$/` |
| `joiningDate` | Date | required, cannot be in the future, indexed |
| `employmentType` | String | required, enum `Fresher` \| `Experienced`, indexed |
| `yearsOfExperience` | Number | required when `Experienced`, 0–50 |
| `previousOrganization` | String | required when `Experienced`, ≤ 100 |
| `previousRole` | String | required when `Experienced`, ≤ 100 |
| `previousExperienceDescription` | String | required when `Experienced`, ≤ 1000 |
| `isActive` | Boolean | default `true` — soft-delete flag, stripped from JSON |
| `isArchived` | Boolean | default `false` — archive flag, stripped from JSON |
| `createdAt` / `updatedAt` | Date | automatic timestamps |

The four previous-experience fields use **function-valued `required`**, so they only apply
when `employmentType === 'Experienced'`. For freshers they stay `undefined` rather than being
stored as empty strings.

**Indexes** — `employee_text_search` (weighted text: name 10, department 5, role 3),
`active_department_created`, `pagination_default`, `joining_date_sort`, and unique
`email_unique`. `Employee.createIndexes()` runs on module load and logs the result.

**`toJSON`** maps `_id` → `id` and deletes `__v`, `isActive` and `isArchived`, so the
soft-delete flags never reach a client.

**Virtuals** — `fullInfo` (`"Name - Role (Department)"`) and `yearsOfService`.

**Instance methods** — `softDelete()`, `archive()`, `restore()`.
**Statics** — `findActive()`, `countActive()`, `findPaginated()` (parallel query + count via
`Promise.all`), `bulkCreate()`.

**Hooks** — a `pre('save')` normaliser lowercases email and trims strings; `post('save')`
logs the write; a `post('save')` error handler converts MongoDB duplicate-key `11000` into
`"<field> already exists"`.

### User — collection `users`

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–100, indexed |
| `email` | String | required, unique, lowercased, regex-validated, indexed |
| `passwordHash` | String | required, bcrypt, `select: false` |
| `createdAt` / `updatedAt` | Date | automatic timestamps (`versionKey` disabled) |

A `pre('save')` hook hashes the password with **bcrypt at 12 salt rounds**, but only when the
field was actually modified. `comparePassword()` wraps `bcrypt.compare`. `toSafeObject()` and
the `toJSON` transform both delete `passwordHash`, and it is excluded from queries by default
— `findByEmailWithPassword()` is the only path that opts back in via `.select('+passwordHash')`.

---

## Validation

Three layers that agree because they share one definition.

1. **Client** — `frontend/src/utils/validation.js` calls `validateEmployeeData()` from the
   shared schema, returning one message per field for the form.
2. **API** — `backend/src/validators/employee.validator.js` parses the body with the same
   shared Zod schema and responds `400` with `{ field, message }` pairs. Auth routes use
   `express-validator` instead.
3. **Database** — Mongoose schema validators as the final backstop.

### Shared schema

`shared/schemas/employee.schema.js` exports:

- `employeeSchema` — full validation for creates.
- `updateEmployeeSchema` — `employeeBaseSchema.partial()` for updates, so untouched fields
  are left alone.
- `validateEmployeeData(data)` — frontend helper returning `{ success, errors }`.

The base shape is deliberately kept as a plain `ZodObject` with no refinements, because
`.partial()` is only available on a `ZodObject`. The conditional rules are layered on
afterwards by `withEmploymentRules()`, which applies a `superRefine` that returns
immediately unless `employmentType === 'Experienced'`. That is why a partial update which
does not touch `employmentType` never trips the experience requirements.

`employmentType` membership is checked with `.refine()` rather than `z.enum()` so the error
message is stable across Zod major versions.

### Fresher vs Experienced

| | Fresher | Experienced |
| --- | --- | --- |
| Previous-experience fields in the form | Hidden | Shown |
| Required by the schema | No | Yes |
| Stored in MongoDB | `undefined` | Values |
| Returned by the API | Omitted by the DTO | Included |

`yearsOfExperience` must be 0–50; `previousOrganization`, `previousRole` and
`previousExperienceDescription` must each clear their minimum length. Blank, `null` and
whitespace-only values are all treated as "not provided" by an `isBlank` helper.

---

## Authentication

JWTs live in HttpOnly cookies. Tokens are never exposed to JavaScript and never stored in
`localStorage` or `sessionStorage`.

**Signup** → `POST /api/auth/signup`. Email is normalised and checked for uniqueness, the
password is hashed by the model's `pre('save')` hook, and the response is `201`. The client
then redirects to login — signup does not log you in.

**Login** → `POST /api/auth/login`. `bcrypt.compare` runs against the stored hash, then two
cookies are set. Tokens are deliberately **not** included in the response body.

| Cookie | Signed with | `maxAge` |
| --- | --- | --- |
| `accessToken` | `JWT_SECRET` | 24 hours |
| `refreshToken` | `REFRESH_TOKEN_SECRET` | 7 days |

Cookie flags are derived from the protocol, not from `NODE_ENV`:

```js
const isHttps = process.env.CLIENT_URL?.startsWith('https://');
// httpOnly: true always
// secure:   isHttps
// sameSite: isHttps ? 'strict' : 'lax'
// path:     '/'
```

Keying off `CLIENT_URL` rather than `NODE_ENV` matters because a `secure` cookie is silently
dropped over plain HTTP. With `NODE_ENV=production` on a plain-HTTP host, login would return
`200` and every subsequent request would still be `401`. Tying the flag to the actual scheme
avoids that class of bug, and `sameSite: 'lax'` in local development lets the Vite dev server
on a different port keep its cookies.

**Request authentication** — `backend/src/middlewares/auth.middleware.js` reads `accessToken`
from the cookie, falling back to an `Authorization: Bearer` header, verifies it, loads the
user with `passwordHash` excluded, and attaches `req.user` and `req.userId`. It exports both
`authenticate` (rejects with `401`) and `optionalAuthenticate` (used by `/api/auth/status`).

**Logout** → `POST /api/auth/logout` clears both cookies.

**Frontend guarding** — `AuthCheck` in `App.jsx` runs `checkAuth()` on mount.
`ProtectedRoute` shows a spinner while that boot-time `GET /api/auth/me` is in flight, then
either renders the page or redirects to `/login` while preserving the attempted location.
Login and Signup redirect to Home when already authenticated.

---

## Security

| Measure | Implementation |
| --- | --- |
| Password hashing | bcrypt, 12 salt rounds, in a `pre('save')` hook |
| Token storage | JWT in HttpOnly cookies; never in `localStorage`/`sessionStorage` |
| Cookie hardening | `secure` + `SameSite=Strict` whenever `CLIENT_URL` is HTTPS |
| Route protection | `router.use(authenticate)` on all employee and department routes |
| Generic auth errors | "Invalid email or password" regardless of which half was wrong |
| Secret management | Both JWT secrets come from env; nothing hard-coded |
| Rate limiting | Global 100/15min, writes 30/15min, auth 5/15min, with an IP whitelist |
| Security headers | Helmet with CSP, HSTS, `frameguard: deny`, `noSniff`, referrer policy |
| CORS | Explicit origin whitelist validator with `credentials: true` |
| Request size limits | 100kb JSON and urlencoded, 50-parameter cap |
| Request timeout | 30 seconds |
| NoSQL injection | `express-mongo-sanitize` plus a custom sanitiser stripping `$` and dotted keys |
| Prototype pollution | `__proto__`, `constructor` and `prototype` keys removed |
| XSS | Tag, `javascript:` and event-handler stripping on input |
| HTTP parameter pollution | `hpp` |
| Mass assignment | Field whitelists reject `_id`, `__v`, timestamps, `isActive`, `isArchived` |
| ReDoS | Text-index search instead of regex; search terms sanitised and length-capped |
| Sensitive data | `passwordHash` blocked by query projection, `toJSON` and `toSafeObject()` |
| Logging hygiene | Passwords and tokens are never logged |

CORS uses a function validator that allows requests with **no** origin (Postman, curl, native
apps) and otherwise requires an exact match against `ALLOWED_ORIGINS`, rejecting with
`Not allowed by CORS`.

---

## Caching and data freshness

There are two independent caches, and the distinction matters.

**Server-side** — an in-memory LRU with TTL (`utils/cache.js`, applied by
`cache.middleware.js`). Employee responses are cached 5 minutes, department responses 10
minutes. Every `POST`, `PUT` and `DELETE` on `/api/employees` runs `invalidateCache` for both
the `employees` and `departments` caches, so the server never serves a stale body after a
mutation.

**Browser-side** — driven by the `Cache-Control` header from `httpCache.middleware.js`.
Available presets are `noCache`, `short` (5min), `medium` (30min), `long` (1h), `static`
(1y) and `revalidate`.

All four authenticated read routes use **`revalidate`**, which emits:

```
Cache-Control: no-cache, private, must-revalidate
```

Mutations use `noCache` (`no-store`).

`revalidate` is the deliberate choice for authenticated reads. Under a `max-age` preset the
browser answers from its own cache without contacting the server at all, so clearing the
server cache after an add or delete had no effect — the UI kept showing pre-mutation
headcounts until the window expired. `no-cache` forces a conditional request every time,
while the `etag()` middleware still answers with a cheap `304 Not Modified` when nothing
changed. Freshness is guaranteed; the bandwidth saving is retained.

`vary(['Accept', 'Accept-Encoding'])` is applied to the employee list so cached entries are
keyed correctly.

---

## Search

**Global search (Home)** hits the API. The service sanitises the term — non-alphanumerics
stripped, trimmed, capped at 100 characters — and runs a MongoDB `$text` query against the
weighted index (`name` 10, `department` 5, `role` 3). Regex is deliberately avoided to
eliminate ReDoS exposure. Results are then filtered again client-side on name, role and
department so that typing a department name behaves the way users expect.

**Department filter (Home)** is pure client-side filtering over the already-loaded department
summaries, so there is no request per keystroke.

**In-department search** on `/departments/:departmentName` filters that department's list.

Every search input is debounced at 300ms through `useDebounce`.

Home derives its totals from the authoritative API payload — `totalEmployees` is a
`reduce` over `departmentSummaries[].employeeCount`, never `departments.length` and never a
hard-coded value.

---

## UI / UX

Tailwind utilities plus a small set of semantic component classes (`.btn`, `.input`, `.card`,
`.badge`, `.link-accent`) defined in `frontend/src/index.css`. Control heights are consistent
(42px standard, 36px for `.btn-sm`), there is a single card radius (`--radius-card: 10px`),
and shadows are restrained. Green is the primary action colour; coral marks destructive
actions.

Loading, empty, error and unauthorised states are all handled explicitly: spinners and
skeletons from `LoadingFallback.jsx`, `.empty-state` blocks for no results, and toasts via
`react-hot-toast` (themed from the same CSS variables so they follow light/dark mode).

### Colour tokens

| Token | Light value | Purpose |
| --- | --- | --- |
| `--color-primary` | `#107C41` | Primary buttons, links, key actions |
| `--color-primary-subtle` | `#DCF1E7` | Selected / active backgrounds |
| `--color-accent` | `#2CA873` | Active navigation, icons, highlights |
| `--color-danger` | `#E47D51` | Destructive actions |
| `--color-bg-base` | `#F4F5F7` | Page background |
| `--color-text-primary` | `#333333` | Primary text |
| `--color-text-secondary` | `#73787D` | Secondary text, placeholders |

### Light / dark mode

`hooks/useTheme.js` reads `localStorage['employee-directory-theme']` first and falls back to
`prefers-color-scheme`. It toggles a `dark` class on `<html>`; every colour is a CSS variable
redefined under `:root.dark`, so no component needs `dark:` colour variants. Dark mode is
re-toned rather than inverted — surfaces are deep neutral slate, never pure black, and the
brand green lifts to `#2CA873` to hold contrast.

Transitions are limited to `background-color`, `border-color`, `color`, `fill`, `stroke` and
`box-shadow` at 240ms; layout and size are never animated.

### Accessibility

- Semantic landmarks, `role="article"` on cards, `role="search"` on search regions.
- Every input has a real `<label>`; errors are wired up with `aria-describedby` and
  `aria-invalid`.
- Live regions (`aria-live="polite"`, `role="status"`) announce result counts and loading.
- Skip-to-main-content link as the first focusable element.
- Visible focus rings via `:focus-visible` with a theme-aware offset colour.
- Icon-only controls carry descriptive labels; decorative SVGs are `aria-hidden`.
- `prefers-reduced-motion: reduce` collapses transitions and animations to ~0.
- Contrast: primary green on white 5.3:1, and 5.5:1 in dark mode.

Full WCAG conformance would still require manual testing with real assistive technology and
an expert accessibility review.

---

## Performance

**Backend**

- Connection pool 5–50 with tuned timeouts and zlib wire compression.
- In-memory LRU caches with TTL, invalidated on every write.
- HTTP `ETag` support so revalidation costs a `304` rather than a full body.
- `Promise.all` for parallel query + count, `.lean()` reads, selective projection.
- Indexes covering text search, department filtering, pagination and sorting.
- gzip/deflate response compression above a 1KB threshold, level 6.

**Frontend**

- Route-level code splitting via `React.lazy` with skeleton fallbacks.
- Data and action contexts split so actions never re-render data consumers.
- `memo` on list and card components; `useCallback` / `useMemo` on hot paths.
- 300ms debounced search inputs.
- In-flight request de-duplication in both the Axios layer and the actions context.
- Production build: terser minification with `console.*` and `debugger` dropped, manual chunk
  splitting (`react-vendor`, `utils-vendor`, `vendor`), CSS code splitting, assets under 4KB
  inlined, plus `.gz` and `.br` precompressed variants for anything over 1KB.

The dev server pins `port: 5173` with `strictPort: true`. That is intentional — the backend
CORS whitelist is origin-exact, so silently drifting to 5174 would break every credentialed
request with an opaque CORS error. If the port is taken, free it rather than letting Vite move.

---

## Scripts

### Backend

| Script | Does |
| --- | --- |
| `npm start` | Production server (`node src/server.js`) |
| `npm run dev` | Server with `node --watch` |
| `npm run seed` | Seed sample employees |
| `npm test` | Full Jest suite (ESM via `--experimental-vm-modules`) |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:unit` | `tests/unit` only |
| `npm run test:integration` | `tests/integration` only |
| `npm run test:coverage` | Coverage report |
| `npm run test:all` | Alias for `test:coverage` |

### Frontend

| Script | Does |
| --- | --- |
| `npm run dev` | Vite dev server on 5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built output |
| `npm test` | `vitest run` (single pass) |
| `npm run test:watch` | `vitest` in watch mode |
| `npm run test:coverage` | Coverage report |

---

## Testing

**Backend** — Jest with `mongodb-memory-server`, so no real database is required, and
Supertest for HTTP. 14 suites:

- **Unit (8)** — `cache`, `employee.model`, `employee.repository`, `employee.service`,
  `errorHandler`, `massAssignment`, `requestSecurity`, `sanitization`.
- **Integration (6)** — `auth.routes`, `employee.routes`, `department.routes`,
  `employmentType`, `rateLimit`, `db.config`.

Integration tests whitelist the loopback address so the shared rate-limiter store does not
make runs order-dependent, and clear the response caches between tests.

**Frontend** — Vitest and Testing Library in jsdom, with tests colocated next to their
source. 11 suites: `EmployeeCard`, `EmployeeForm`, `EmployeeList`, `ProtectedRoute`, plus
`Home`, `AddEmployee`, `EditEmployee`, `EmployeeDetails`, `DepartmentEmployees`, `Login` and
`Signup`.

`vitest.config.js` is kept separate from `vite.config.js` so the terser and compression
plugins never run during tests.

```bash
cd backend  && npm test
cd frontend && npm test
```

---

## Known limitations

**Security / correctness**

- **`/api/cache/stats` and `/api/cache/clear` are unauthenticated.** They are registered in
  `app.js` before the API routers and carry no `authenticate` middleware, so anyone who can
  reach the server can read cache statistics or flush the caches. Flushing is not
  destructive to data, but it is a free way to degrade performance. Worth putting behind
  `authenticate` (or binding to localhost) before this is exposed beyond your machine.
- **No CSRF token.** Protection currently rests on `SameSite` cookies plus the CORS
  whitelist.
- **No RBAC.** Every authenticated user has identical permissions — any logged-in user can
  edit or delete any employee.
- **The refresh token is issued but never consumed.** There is no `/api/auth/refresh`
  endpoint, so once the 24-hour access token expires the user must log in again even though a
  valid 7-day refresh cookie is sitting in the browser.

**Behavioural**

- **Lists are capped at the API's default page size.** `employeeService.getEmployees()`
  forwards only `search` and `department`, so no `limit` is sent and the backend default of
  **10** applies. Global search results and department detail lists are therefore truncated
  at 10 records, and a department containing more than 10 employees will show fewer rows than
  its own headcount (which comes from the authoritative aggregate). Passing an explicit
  `limit` up to the clamp of 100 would close this gap.
- **Mutations patch local state and then refetch only the department summaries.** Headcounts
  on Home update immediately after an add, edit or delete, but the employee array for a
  department page is not re-queried, so an edit that moves someone between departments may
  need a navigation or refresh to be reflected in both lists.
- **Global search runs a second client-side filter**, so its results are bounded by whatever
  the API already returned.
- **Delete is a hard delete.** `softDelete()`, `archive()` and `restore()` exist on the model
  and the repository filters on those flags, but the delete endpoint removes the document
  outright.
- **Caches and rate-limit counters are in-process.** Fine for a single local instance; behind
  a load balancer each replica would keep its own, making limits effectively per-instance.
  Sharing them would need Redis.

**Housekeeping**

- **Zod major versions disagree.** `shared/package.json` pins `zod@^3.23.8` while
  `backend/package.json` pins `zod@^4.4.3`. The shared schema is written defensively for this
  (membership via `.refine()` instead of `z.enum()`, and `validateEmployeeData` reads both
  `error.issues` and `error.errors`), but aligning the two would remove a real footgun.
- **Duplicate index warning on boot.** `email` is declared both inline (`unique: true`) and
  again via `schema.index()` on both models, so Mongoose logs a duplicate-index warning. It
  is cosmetic.
- **`vite.config.js` chunks `@heroicons`**, which is not a dependency. Harmless dead branch.
- **No linter or formatter.** There is no ESLint or Prettier configuration, so "lint" is not
  part of any verification step.
- **No E2E tests.**

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ERR_CONNECTION_REFUSED` on login/signup | Backend isn't running. `cd backend && npm run dev` |
| `Missing required environment variables` on boot | No `backend/.env`. Copy `.env.example` and set `MONGO_URI` and `PORT` |
| `VITE_API_URL environment variable is not configured` | No `frontend/.env`. Set `VITE_API_URL=http://localhost:5000/api` |
| `EADDRINUSE :::5000` | A previous backend is still bound. Find it with `Get-NetTCPConnection -LocalPort 5000` and stop that PID |
| `Port 5173 is already in use` | Vite uses `strictPort`, so it fails instead of moving. Free it: `Get-NetTCPConnection -LocalPort 5173`, then `Stop-Process -Id <pid> -Force` |
| `MongoDB Connection Error`, then exit | Unreachable database. It retries 5× at 5s before exiting. Check `mongod` is running, or for Atlas that your IP is allowlisted and the password is URL-encoded |
| `Cannot find package 'zod'` | `shared/` was never installed. `cd shared && npm install` |
| Every API call returns `401` | Not logged in, or the cookie was dropped. Confirm `ALLOWED_ORIGINS` contains the exact frontend origin |
| Login returns `200`, next request is `401` | The cookie wasn't stored. Usually a `secure` cookie over plain HTTP — check whether `CLIENT_URL` starts with `https://` while you're serving HTTP |
| `Not allowed by CORS` | Frontend origin missing from `ALLOWED_ORIGINS` |
| `429 Too many requests` | Rate limit hit (auth is 5/15min). Wait it out, or add your IP to `RATE_LIMIT_WHITELIST` in development |
| A new employee doesn't appear | Should be immediate now that reads send `no-cache`. If it persists, hard-refresh and check the browser devtools Network tab shows a `304`/`200` rather than `(disk cache)` |
| A department shows fewer rows than its headcount | Expected above 10 employees — see [Known limitations](#known-limitations) |
| Duplicate schema index warning on boot | Cosmetic; `email` is indexed twice on both models |
| Blank page after a rebuild | Stale lazy chunk. The app self-reloads once, then shows a retry screen; hard-refresh if it persists |

---

## Licence

ISC
