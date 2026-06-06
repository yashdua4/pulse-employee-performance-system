# Pulse - Employee Performance Management System

Pulse is a full-stack, modern Employee Performance Management System designed to evaluate, track, and optimize corporate personnel metrics, attendance registry, project boards, and quarterly reviews.

---

## Technical Stack
* **Frontend**: React (v19), TypeScript, TailwindCSS (v4), Lucide Icons, React Router DOM (v6)
* **Backend**: Node.js, Express, tsx watch, express-rate-limit, JWT, bcrypt
* **Database**: Prisma ORM with PostgreSQL (support for SQLite fallback included)

---

## Installation & Setup

### 1. Repository Setup & Dependencies
Clone the repository and install packages for both sub-projects:

**Backend Setup:**
```bash
cd backend
npm install
```

**Frontend Setup:**
```bash
cd ../frontend
npm install --legacy-peer-deps
```

---

## Database Configuration

### Option A: PostgreSQL (Default)
1. Make sure a PostgreSQL instance is running.
2. In `backend/.env`, configure your connection string:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pulse_db"
   ```
3. Run migrations and client generation:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```
4. Seed the database with mock roles:
   ```bash
   npm run db:seed
   ```

### Option B: SQLite Fallback (Quick Start without Postgres)
If you don't have PostgreSQL installed locally, you can swap to SQLite in seconds:

1. Open `backend/prisma/schema.prisma` and edit the datasource block:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
2. Delete the enums at the top of the file since SQLite does not support native Prisma `enum` (replace enum types with `String` inside the models, e.g. change `role Role` to `role String` and set default as a string like `@default("EMPLOYEE")`).
3. Run migrations and client generation:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run the database seed script:
   ```bash
   npm run db:seed
   ```

---

## Default Credentials (Seed Data)
Once seeded, the database contains three default roles you can use to test different dashboard scopes:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pulse.com` | `password123` | Can view all logs, projects, and manage staff accounts. |
| **Manager** | `manager@pulse.com` | `password123` | Can view team attendance, projects they lead, and write performance evaluations. |
| **Employee** | `employee@pulse.com` | `password123` | Can clock-in/out, update their tasks, view personal work hours and feedback. |
| **Employee 2** | `employee2@pulse.com` | `password123` | Another team member reporting to the same manager. |

---

## Running the Application

To run the full stack locally, open two terminal windows:

### Term 1: Run Backend Server
```bash
cd backend
npm run dev
```
* The server will boot at: [http://localhost:5000](http://localhost:5000)
* Healthcheck status: [http://localhost:5000/health](http://localhost:5000/health)

### Term 2: Run Frontend Client
```bash
cd frontend
npm run dev
```
* The client dashboard will launch at: [http://localhost:5173](http://localhost:5173)
