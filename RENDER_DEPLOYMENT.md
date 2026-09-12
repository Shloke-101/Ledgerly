# Deploying Ledgerly on Render

This guide outlines the deployment options for Ledgerly on **[Render.com](https://render.com)**.

---

## Option 1: 1-Click Infrastructure Blueprint (Recommended)

Render Blueprints read the root [`render.yaml`](file:///c:/Projects/Ledgerly/render.yaml) file in this repository and automatically provision all necessary resources in one step:
- **`ledgerly-backend`**: FastAPI Web Service with Python 3.11 runtime and `/health` health-check.
- **`ledgerly-frontend`**: Static Site building the Vite + React frontend with automatic SPA rewrites.
- **`ledgerly-celery-worker`**: Background worker for async scanning jobs.
- **`ledgerly-db`**: Managed PostgreSQL Database.
- **`ledgerly-redis`**: Managed Redis instance.

### Steps:
1. Push this repository to your **GitHub** or **GitLab** account.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your Ledgerly repository.
5. Render will automatically parse `render.yaml`.
6. (Optional) Provide secret values for `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` in the dashboard prompts.
7. Click **Apply**. Render will automatically provision the database, redis, backend, worker, and frontend.

---

## Option 2: Deploying Backend as an Individual Web Service

If you only want to deploy the backend API web service manually:

1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the following settings:
   - **Name**: `ledgerly-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `./render_build.sh` (or `pip install -r requirements.txt`)
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Set Environment Variables under the **Environment** tab:
   | Key | Value / Description |
   |---|---|
   | `PYTHON_VERSION` | `3.11.10` |
   | `DATABASE_URL` | PostgreSQL connection string (or leave unset for standalone SQLite) |
   | `REDIS_URL` | Redis connection string (or leave unset for memory fallback) |
   | `CORS_ORIGINS` | `*` (or your frontend URL, e.g. `https://your-frontend.onrender.com`) |
   | `ANTHROPIC_API_KEY` | *(Optional)* Your Anthropic API Key |
   | `GITHUB_TOKEN` | *(Optional)* Your GitHub Personal Access Token |

---

## Option 3: Deploying Frontend as a Static Site on Render

1. In the Render Dashboard, click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure settings:
   - **Name**: `ledgerly-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects/Rewrites**:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`
5. Under **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend.onrender.com` (your backend Web Service URL)

---

## Option 4: Deploying using Docker

Both the backend and frontend include production-ready Dockerfiles.

### Backend Docker Web Service:
- **Root Directory**: `backend`
- **Dockerfile Path**: `backend/Dockerfile`
- The backend Dockerfile automatically listens on Render's dynamic `$PORT`.

### Frontend Docker Web Service:
- **Root Directory**: `frontend`
- **Dockerfile Path**: `frontend/Dockerfile`
- Uses multi-stage build with Nginx for fast static asset delivery.
