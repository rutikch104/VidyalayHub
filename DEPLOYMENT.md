# VidhyalayHub — Production Deployment (Vercel + AWS + PostgreSQL)

## Architecture

| Layer    | Host        | Path                          |
|----------|-------------|-------------------------------|
| Frontend | Vercel      | `educational_platform_frontend` |
| Backend  | AWS         | `educational_platform_backend`  |
| Database | PostgreSQL  | RDS or managed Postgres         |

---

## 1. Database (PostgreSQL)

1. Create a PostgreSQL instance (AWS RDS recommended).
2. Create database and user; note host, port, name, user, password.
3. Set backend env vars (see `educational_platform_backend/.env.example`).

**Pool tuning (production):**

```
POSTGRESQL_POOL_MAX=20
POSTGRESQL_POOL_MIN=2
POSTGRESQL_POOL_ACQUIRE=30000
POSTGRESQL_POOL_IDLE=10000
```

---

## 2. Backend (AWS)

### Environment

Copy `.env.example` → `.env` on the server. Required:

- `NODE_ENV=production`
- `NODE_PORT=3030` (or your ALB target port)
- `POSTGRESQL_*` credentials
- `JWT_SECRET` (strong random string)
- `ALLOWED_ORIGINS=https://your-app.vercel.app` (your Vercel URL)
- `TRUST_PROXY=1` if behind ALB/nginx

### Run options

**Node (single process):**

```bash
cd educational_platform_backend
npm ci --omit=dev
npm run start:prod
```

**PM2 (cluster on EC2):**

```bash
npm ci --omit=dev
mkdir -p logs uploads
npm run pm2:prod
```

**Docker (ECS / App Runner / EC2):**

```bash
npm run docker:build
npm run docker:run
```

### Health checks

- `GET /health` or `GET /api/health` — returns `200` when DB is connected, `503` otherwise.

### Uploads

User uploads are stored in `uploads/`. On AWS, mount EFS or use S3 with a future adapter; for MVP, persist the volume in Docker/EC2.

### Security (enabled)

- Helmet, compression, rate limiting on `/api`
- CORS whitelist via `ALLOWED_ORIGINS`
- Production error messages hide stack traces

---

## 3. Frontend (Vercel)

1. Import repo; set **Root Directory** to `educational_platform_frontend`.
2. Framework preset: **Vite**.
3. Environment variables:

   | Name                 | Example                              |
   |----------------------|--------------------------------------|
   | `VITE_API_BASE_URL`  | `https://api.yourdomain.com/api`     |
   | `VITE_USE_MOCK`      | `false` (or leave unset)             |

4. Deploy. `vercel.json` handles SPA routing and static asset caching.

### Local production build

```bash
cd educational_platform_frontend
npm ci
npm run build
npm run preview
```

---

## 4. CORS checklist

Backend `ALLOWED_ORIGINS` must include every frontend origin:

```
ALLOWED_ORIGINS=https://vidhyalayhub.vercel.app,https://www.yourdomain.com
```

Redeploy/restart backend after changing.

---

## 5. Post-deploy verification

1. `curl https://api.yourdomain.com/api/health`
2. Open Vercel app → login → feed loads
3. Teacher Center → questions load (no 500)
4. File upload on a post (if used)

---

## 6. Scripts reference

| Location   | Command              | Purpose              |
|------------|----------------------|----------------------|
| Backend    | `npm start`          | Dev (nodemon)        |
| Backend    | `npm run start:prod` | Production node      |
| Backend    | `npm run pm2:prod`   | PM2 cluster          |
| Frontend   | `npm run dev`        | Vite dev server      |
| Frontend   | `npm run build`      | Production bundle    |
