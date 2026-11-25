# StockFlow — Multi-Tenant Inventory Management

A multi-tenant SaaS inventory management system built with **Django + Django REST Framework**, **React + Vite**, and **MySQL**.

---

## Architecture

- **Frontend:** React 19 + Vite 6 SPA deployed on **Vercel** (`frontend/`).
  - Uses a same-origin `/api/*` rewrite in [frontend/vercel.json](frontend/vercel.json) (and Vite's dev proxy in [frontend/vite.config.js](frontend/vite.config.js)) so session cookies and CSRF protection remain strictly first-party.
- **Backend:** Django 5.2 + DRF + Gunicorn + WhiteNoise deployed on **Render** (`backend/`).
  - Custom email-based `accounts.User` model, `Organization`-scoped `inventory.Product` model, and HttpOnly session authentication with CSRF protection.
- **Database:** **MySQL 8** primary database (`mysqlclient`, `utf8mb4`, TLS-ready for managed cloud MySQL such as **TiDB Cloud Starter**), with an optional `DB_ENGINE=sqlite3` override for local development/testing when MySQL is unavailable.

```text
Browser (HTTPS)
  └── Vercel SPA (React + Vite)
        ├── /*        ──▶ /index.html (SPA routes: /login, /signup, /dashboard, /products)
        └── /api/*    ──▶ Render Web Service (Gunicorn + Django/DRF + WhiteNoise)
                            └── TLS MySQL (Managed MySQL / TiDB Cloud Starter)
```

---

## Project Structure

```text
stockflow-inventory-management/
├── backend/
│   ├── Dockerfile              # Production container image with mysqlclient headers & Gunicorn
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── config/                 # Django settings, URLs, WSGI/ASGI
│   ├── accounts/               # Organization, email-based User, session auth APIs & tests
│   └── inventory/              # Organization-scoped Product CRUD, search, dashboard metrics & tests
└── frontend/
    ├── vercel.json             # Same-origin /api proxy + SPA fallback rewrites
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    └── src/
        ├── api/                # Fetch client (CSRF + credentials) and endpoint helpers
        ├── components/         # AuthLayout, AppShell, ProductFormModal, DeleteConfirmModal
        ├── pages/              # LoginPage, SignupPage, DashboardPage, ProductsPage
        └── styles/             # Editorial design tokens, auth styles, inventory styles
```

---

## Local Development Setup

### Prerequisites
- Python 3.12+ (tested on 3.13)
- Node.js 20+ and npm
- MySQL 8+ (optional locally if using the `DB_ENGINE=sqlite3` fallback)

### 1. Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1        # On macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # On macOS/Linux: cp .env.example .env
```

Edit `backend/.env` for your local database:
- **With MySQL:** set `DB_ENGINE=mysql`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
- **Without local MySQL:** set `DB_ENGINE=sqlite3`.

Run migrations and start the development server:

```powershell
python manage.py migrate
python manage.py runserver
```

Verify backend health at `http://127.0.0.1:8000/api/health/`.

### 2. Frontend Setup

```powershell
cd frontend
npm install
copy .env.example .env            # Keeps VITE_API_BASE_URL=/api for Vite proxy
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` requests to `http://127.0.0.1:8000`.

---

## Environment Variables

### Backend (`backend/.env.example`)

| Variable | Default / Example | Description |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | *(required when `DJANGO_DEBUG=False`)* | Cryptographically random secret key |
| `DJANGO_DEBUG` | `True` (`False` in prod) | Enables debug mode and DRF browsable API |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hostnames |
| `DJANGO_SECURE_SSL_REDIRECT` | `True` when `DJANGO_DEBUG=False` | Redirects HTTP to HTTPS (exempts `/api/health/`) |
| `DB_ENGINE` | `mysql` | `mysql` (default/prod) or `sqlite3` (local fallback) |
| `DB_NAME` | `stockflow_db` | Database name |
| `DB_USER` | `root` | Database username |
| `DB_PASSWORD` | — | Database password |
| `DB_HOST` | `127.0.0.1` | Database host |
| `DB_PORT` | `3306` | Database port (`4000` for TiDB Cloud) |
| `DB_CONN_MAX_AGE` | `60` | Persistent connection max age in seconds |
| `DB_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` | Optional CA cert path for TLS MySQL |
| `DB_SSL_MODE` | `REQUIRED` | Optional MySQL SSL mode (`REQUIRED`, `VERIFY_CA`, `VERIFY_IDENTITY`) |
| `DEFAULT_LOW_STOCK_THRESHOLD` | `5` | Global fallback threshold when product threshold is `NULL` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated trusted HTTPS/dev origins |

### Frontend (`frontend/.env.example`)

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API base path (proxied via Vite locally and Vercel in production) |

---

## API Endpoints

All authenticated endpoints require a valid session cookie and `X-CSRFToken` header on state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`). Inventory endpoints are strictly scoped to `request.user.organization`; cross-tenant resource IDs return `404`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health/` | Public | Service readiness check (`{"status": "ok"}`) |
| `GET` | `/api/auth/csrf/` | Public | Sets `csrftoken` cookie for SPA requests |
| `POST` | `/api/auth/signup/` | Public | Registers user, creates Organization server-side, starts session |
| `POST` | `/api/auth/login/` | Public | Authenticates email + password, starts HttpOnly session |
| `POST` | `/api/auth/logout/` | Session | Clears active session |
| `GET` | `/api/auth/me/` | Session | Returns authenticated user and organization |
| `GET` | `/api/products/?search=` | Session + Org | Lists organization products; filters by `name` or `sku` |
| `POST` | `/api/products/` | Session + Org | Creates product (`sku` normalized uppercase, unique per org) |
| `GET` | `/api/products/<id>/` | Session + Org | Retrieves single organization product |
| `PUT` / `PATCH` | `/api/products/<id>/` | Session + Org | Updates product fields or inline `quantity_on_hand` |
| `DELETE` | `/api/products/<id>/` | Session + Org | Deletes product |
| `GET` | `/api/dashboard/metrics/` | Session + Org | Returns `total_products`, `total_quantity`, `low_stock_count`, and `low_stock_products` (`quantity <= threshold`) |

---

## Running Tests & Verification

### Backend Tests & System Checks

```powershell
cd backend
$env:DB_ENGINE="sqlite3"   # omit if testing against local MySQL
python manage.py check
python manage.py test accounts inventory -v 2
```

Covers signup, server-side organization creation, duplicate email rejection, login/logout, session persistence, tenant isolation (`404` across organizations), per-org SKU uniqueness, negative/invalid input validation, search, inline quantity `PATCH`, and low-stock threshold boundary metrics.

### Frontend Production Build

```powershell
cd frontend
npm run build
```

---

## Production Deployment (Vercel + Render + Managed MySQL)

1. **Managed MySQL (e.g. TiDB Cloud Starter):**
   - Provision a MySQL-compatible cluster and database `stockflow_db`.
   - Note host, port (`4000` for TiDB Cloud), user, password, and TLS CA path (`/etc/ssl/certs/ca-certificates.crt` on Linux).
2. **Backend on Render:**
   - Create a **Web Service** from this repository using **Docker** runtime with Root Directory `backend` (uses [backend/Dockerfile](backend/Dockerfile) so `mysqlclient` compiles cleanly, `collectstatic` and `migrate` run at startup, and `gunicorn` serves the app).
   - Set Health Check Path to `/api/health/`.
   - Configure all production environment variables (`DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DB_*`, `DB_SSL_CA`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`).
3. **Frontend on Vercel:**
   - Update the backend destination URL in [frontend/vercel.json](frontend/vercel.json) to your live Render service URL (`https://<your-render-service>.onrender.com/api/:path*`).
   - Create a Vercel project with Root Directory `frontend`, Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`.
   - Ensure `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOWED_ORIGINS` on Render include your live `https://<your-app>.vercel.app` URL.

---

## Deployed URLs

- **Frontend App (Vercel):** *(Pending deployment)*
- **Backend API Health Check (Render):** *(Pending deployment)*
