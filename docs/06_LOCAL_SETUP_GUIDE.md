# Local Development Setup Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## System Requirements

| Requirement | Version                                  |
| ----------- | ---------------------------------------- |
| Node.js     | v20+ (LTS)                               |
| PostgreSQL  | v13+                                     |
| npm         | v9+                                      |
| RAM         | 4 GB minimum                             |
| Storage     | 2 GB free space                          |
| OS          | Windows 10+, macOS 12+, or Ubuntu 20.04+ |

---

## Step 1: Install Prerequisites

### Windows

**Node.js & npm**

1. Download from https://nodejs.org/ — choose the LTS version
2. Run the installer with default options
3. Verify:
   ```bash
   node --version
   npm --version
   ```

**PostgreSQL**

1. Download from https://www.postgresql.org/download/windows/
2. Run the installer:
   - Set and remember the `postgres` superuser password
   - Default port: `5432`
   - Accept remaining defaults
3. After installation, add `psql` to your PATH if prompted

**Git**

1. Download from https://git-scm.com/
2. Accept default installation options

---

### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installations
node --version
npm --version
psql --version
```

---

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installations
node --version
npm --version
psql --version
```

---

## Step 2: Get the Project

```bash
# Clone the repository
git clone https://github.com/yourusername/tile-exporter.git
cd tile-exporter

# Verify the structure
ls -la
```

You should see two main directories: `frontend/` and `backend/`.

---

## Step 3: Create the Database

**On Replit** — the database is provisioned automatically. Skip to Step 4.

**On local machines**, create a PostgreSQL database:

```bash
# Connect to PostgreSQL as the postgres superuser
psql -U postgres

# Create the database
CREATE DATABASE tile_exporter_crm;

# (Optional) Create a dedicated app user
CREATE USER tileuser WITH PASSWORD 'choose_a_strong_password';
GRANT ALL PRIVILEGES ON DATABASE tile_exporter_crm TO tileuser;

# Exit psql
\q
```

---

## Step 4: Configure and Start the Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Create the .env file from the example
cp .env.example .env
```

Open `backend/.env` and fill in your values:

```bash
NODE_ENV=development
PORT=8000
HOST=0.0.0.0

# Database — choose either DATABASE_URL or individual vars
DATABASE_URL=postgres://tileuser:your_password@localhost:5432/tile_exporter_crm
# Or:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tile_exporter_crm
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT — change this to any long random string in production
JWT_SECRET=change-this-to-a-long-random-string-at-least-32-chars
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Frontend origin
FRONTEND_URL=http://localhost:5000

# Email (optional for local development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@example.com

# Logging
LOG_LEVEL=info
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15
```

Run migrations and seed the admin user:

```bash
# Run all database migrations
node src/database/migrate.js

# Seed the initial admin user and master/reference data
node src/database/seed.js

# Start the backend server
npm start
```

Backend runs at: **http://localhost:8000**  
Health check: **http://localhost:8000/health**  
API docs (Swagger): **http://localhost:8000/api/docs**

---

## Step 5: Configure and Start the Frontend

Open a **new terminal window** and run:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create a .env file for the frontend
cat > .env << EOF
VITE_API_BASE_URL=/api
EOF

# Start the development server
npm run dev -- --host 0.0.0.0 --port 5000
```

Frontend runs at: **http://localhost:5000**

---

## Step 6: Log In

1. Open **http://localhost:5000** in your browser
2. Log in with the credentials created during seeding
3. Check the terminal output of `node src/database/seed.js` for the admin credentials

---

## Development Workflow

### Starting Both Servers

**Terminal 1 — Backend:**

```bash
cd backend
npm start
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

### Making Code Changes

| Layer             | Behavior                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Backend (Express) | Auto-restarts on file save (nodemon in dev mode)                                                 |
| Frontend (Vite)   | Hot module replacement — changes appear instantly                                                |
| Database schema   | Add a `.sql` file to `backend/src/database/migrations/`, then run `node src/database/migrate.js` |

### Inspecting the Database

```bash
# Connect to the database
psql -U postgres -d tile_exporter_crm

# List all tables
\dt

# View table structure
\d clients

# Run a query
SELECT id, client_name, client_email FROM clients LIMIT 10;

# Exit
\q
```

---

## Environment Variables Reference

### backend/.env

| Variable             | Required | Description                                 |
| -------------------- | -------- | ------------------------------------------- |
| `NODE_ENV`           | Yes      | `development` or `production`               |
| `PORT`               | Yes      | Backend port (default: `8000`)              |
| `HOST`               | Yes      | Listen interface (use `0.0.0.0`)            |
| `DATABASE_URL`       | Yes\*    | Full PostgreSQL connection string           |
| `DB_HOST`            | Yes\*    | Database host (`localhost`)                 |
| `DB_PORT`            | Yes\*    | Database port (`5432`)                      |
| `DB_NAME`            | Yes\*    | Database name (`tile_exporter_crm`)         |
| `DB_USER`            | Yes\*    | Database user                               |
| `DB_PASSWORD`        | Yes\*    | Database password                           |
| `JWT_SECRET`         | Yes      | JWT signing secret (min 32 chars)           |
| `JWT_ACCESS_EXPIRY`  | No       | Access token expiry (default: `7d`)         |
| `JWT_REFRESH_EXPIRY` | No       | Refresh token expiry (default: `30d`)       |
| `FRONTEND_URL`       | Yes      | Frontend origin for CORS                    |
| `SMTP_HOST`          | No       | SMTP server host                            |
| `SMTP_PORT`          | No       | SMTP server port                            |
| `SMTP_USER`          | No       | SMTP username                               |
| `SMTP_PASSWORD`      | No       | SMTP password                               |
| `EMAIL_FROM`         | No       | Sender email address                        |
| `BCRYPT_ROUNDS`      | No       | bcrypt hash rounds (default: `10`)          |
| `MAX_LOGIN_ATTEMPTS` | No       | Login failure limit (default: `5`)          |
| `LOCKOUT_DURATION`   | No       | Lockout duration in minutes (default: `15`) |
| `LOG_LEVEL`          | No       | Log verbosity: `info`, `warn`, `error`      |

_Use either `DATABASE_URL` or the individual `DB\__` variables — not both.

### frontend/.env

| Variable            | Required | Description                              |
| ------------------- | -------- | ---------------------------------------- |
| `VITE_API_BASE_URL` | Yes      | API base path (use `/api` for dev proxy) |

---

## Troubleshooting

### PostgreSQL connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Ensure PostgreSQL is running:

```bash
# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### Port already in use

```
Error: listen EADDRINUSE :::8000
```

Find and stop the conflicting process:

```bash
# macOS/Linux
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Database does not exist

```
FATAL: database "tile_exporter_crm" does not exist
```

Create the database manually:

```bash
psql -U postgres -c "CREATE DATABASE tile_exporter_crm;"
```

Then re-run migrations:

```bash
cd backend && node src/database/migrate.js
```

### npm install fails

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Frontend cannot reach the backend

Verify the backend is running and the Vite proxy is configured. Check `frontend/vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

---

## Useful Commands Reference

```bash
# Backend
cd backend
npm install                       # Install dependencies
npm start                         # Start server (production mode)
node src/database/migrate.js      # Run pending migrations
node src/database/seed.js         # Seed admin + master data

# Frontend
cd frontend
npm install                       # Install dependencies
npm run dev                       # Start dev server with HMR
npm run build                     # Build for production
npm run preview                   # Preview production build locally
```

---

## VS Code Recommended Extensions

- **ESLint** — JavaScript linting
- **Prettier** — Code formatting
- **PostgreSQL** — Database explorer
- **REST Client** — Test API endpoints from `.http` files
- **ES7+ React/Redux/React-Native snippets** — JSX shortcuts

Workspace settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2
}
```

---

## Next Steps

1. Explore the application at http://localhost:5000
2. Review the API at http://localhost:8000/api/docs
3. Read module-specific guides in `docs/`
4. Create test clients, products, and proforma invoices
5. Follow the export workflow from proforma through shipping instructions
