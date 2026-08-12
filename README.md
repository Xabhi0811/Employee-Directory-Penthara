# Employee Directory

Full-stack employee directory for browsing, creating, editing, and deleting employee records, with email/password authentication, shared validation rules, Docker support, and MongoDB Atlas deployment.

The repository is split into three parts:

- `frontend/` for the React + Vite UI
- `backend/` for the Express + MongoDB API
- `shared/` for the shared Zod schema and constants used by both sides

## Features

- Employee CRUD with validated forms
- Department browsing and employee search
- Authentication with JWT cookies
- Protected routes on the frontend
- Shared schema validation between frontend and backend
- Dockerfiles for both apps
- Docker Compose for running the published images locally
- MongoDB Atlas support

## Tech Stack

- Frontend: React 18, Vite, React Router, Axios, React Hot Toast
- Backend: Node.js, Express, Mongoose, JWT, Helmet, CORS, Compression
- Shared: Zod, HTTP and validation constants
- Database: MongoDB / MongoDB Atlas

## Project Structure

```text
Employee Directory/
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── src/
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── src/
├── shared/
│   ├── package.json
│   ├── constants/
│   └── schemas/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### 1. Install dependencies

```powershell
cd shared
npm install

cd ..\backend
npm install

cd ..\frontend
npm install
```

### 2. Configure environment files

Create or update these files:

- `backend/.env`
- `frontend/.env`
- root `.env` for Docker Compose

Use the examples in the repository:

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy .env.example .env
```

### 3. Run locally

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open the frontend in the browser at the Vite URL shown in the terminal.

## Environment Variables

### Backend

`backend/.env` should include:

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `CLIENT_URL`
- `ALLOWED_ORIGINS`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXPIRES_IN`

Example:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://cbittu349_db_user:<your-db-password>@employeedirectory.tzecpp4.mongodb.net/employee-directory?retryWrites=true&w=majority&appName=EmployeeDirectory
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
JWT_SECRET=change-this-before-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=change-this-before-production-too
REFRESH_TOKEN_EXPIRES_IN=7d
```

### Frontend

`frontend/.env` must define:

```env
VITE_API_URL=http://localhost:5000/api
```

### Root `.env`

Docker Compose reads the root `.env` file for the Atlas URI.

## Docker

### Build locally

Backend:

```powershell
docker build -t employee-directory-backend:local -f backend/Dockerfile backend
```

Frontend:

```powershell
docker build --build-arg VITE_API_URL=http://localhost:5000/api -t employee-directory-frontend:local -f frontend/Dockerfile .
```

### Run the published images

The repository is already configured to use these Docker Hub images:

- `xabhi/finalemployee-directory-backend:latest`
- `xabhi/finalemployee-directory-frontend:latest`

Start everything with:

```powershell
docker compose up -d
```

The compose file exposes:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## API Overview

Base URL: `http://localhost:5000/api`

### Authentication

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/status`

### Employees

- `GET /api/employees`
- `GET /api/employees/:id`
- `GET /api/employees/departments/list`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`

### Departments

- `GET /api/departments`

### Health and Cache

- `GET /health`
- `GET /ready`
- `GET /live`
- `GET /api/cache/stats`
- `POST /api/cache/clear`

## Data Model

The employee record supports:

- name
- role
- department
- email
- phone
- joiningDate
- employmentType
- yearsOfExperience
- previousOrganization
- previousRole
- previousExperienceDescription

The shared Zod schema in `shared/schemas/employee.schema.js` is used by both the frontend and backend so the validation rules stay aligned.

## Security

- JWT tokens are stored in HttpOnly cookies
- Passwords are hashed with bcrypt
- CORS uses an allowlist
- Rate limiting is enabled
- Request sanitization is enabled
- Mass assignment is blocked
- Helmet adds security headers

## Testing

Backend:

```powershell
cd backend
npm test
```

Frontend:

```powershell
cd frontend
npm test
```

## Troubleshooting

- If `npm run dev` fails in the backend, check that `MONGO_URI`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` are set.
- If the frontend build fails, make sure `VITE_API_URL` is present in `frontend/.env`.
- If Docker Compose shows an empty Mongo URI, create a root `.env` file from `.env.example`.
- If Atlas rejects the connection, confirm the IP allowlist and database user password.

## Notes

- The frontend build uses the shared package, so keep `shared/` available when building from source.
- The production frontend image serves the app with nginx and includes SPA route fallback support.
