# Render Deployment Guide

This guide assumes:

- MongoDB Atlas is already created
- Razorpay credentials are available
- SMTP credentials are available
- AI provider credentials are available

## Deployment Shape

- Backend: Render Web Service
- Frontend: Render Static Site
- Database: MongoDB Atlas

## Backend Service

Deploy [apps/api](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api) as a Render web service.

### Suggested Settings

- Environment: `Node`
- Root Directory: repository root
- Build Command:

```bash
npm install
```

- Start Command:

```bash
npm run start:api
```

### Required Backend Environment Variables

Copy values from [apps/api/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api\.env.example).

Critical ones:

- `NODE_ENV=production`
- `PORT=10000`
- `WEB_APP_URL=https://<your-frontend-domain>`
- `PUBLIC_SITE_URL=https://<your-frontend-domain>`
- `API_BASE_URL=https://<your-backend-domain>`
- `MONGODB_URI=<your-atlas-uri>`
- `JWT_ACCESS_SECRET=<long-random-secret>`
- `JWT_REFRESH_SECRET=<long-random-secret>`
- `REFRESH_TOKEN_COOKIE_SECURE=true`
- `REFRESH_TOKEN_COOKIE_SAME_SITE=none`
- `BREVO_API_KEY=<your-brevo-api-key>`
- `BREVO_SENDER_EMAIL=<your-verified-brevo-sender-email>`
- `BREVO_SENDER_NAME=ExamNova AI`
- `RAZORPAY_*`
- `AI_*`
- `TRUST_PROXY=true`

### Important Backend Notes

- Render provides the external port through `PORT`
- MongoDB Atlas must allow connections from Render
- Set `REFRESH_TOKEN_COOKIE_SECURE=true` in production
- Set `REFRESH_TOKEN_COOKIE_SAME_SITE=none` when frontend and backend are on separate Render domains
- Keep `PUBLIC_SITE_URL` aligned with the frontend public domain for sitemap and canonical URLs
- Keep `WEB_APP_URL` aligned with the frontend domain for CORS
- Render's default filesystem is ephemeral across deploys/restarts, so PDF uploads/downloads should use a persistent disk mount for `LOCAL_UPLOAD_DIR`
- Recommended example: mount a persistent disk and set `LOCAL_UPLOAD_DIR=/var/data/examnova-uploads`
- If existing admin-uploaded or generated PDFs were saved only on ephemeral local disk, those specific files may need to be re-uploaded or re-rendered once after switching storage

## Frontend Service

Deploy [apps/web](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web) as a Render static site.

### Suggested Settings

- Build Command:

```bash
npm install && npm run build --workspace @examnova/web
```

- Publish Directory:

```text
apps/web/dist
```

### Required Frontend Environment Variables

Copy values from [apps/web/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web\.env.example).

Set:

- `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
- `VITE_SITE_URL=https://<your-frontend-domain>`
- `VITE_PUBLIC_SITE_URL=https://<your-frontend-domain>`
- `VITE_APP_NAME=ExamNova AI`

Optional pricing display vars:

- `VITE_PRIVATE_PDF_PRICE=4`
- `VITE_MARKETPLACE_MIN_PRICE=4`
- `VITE_MARKETPLACE_MAX_PRICE=10`

## URL Coordination Checklist

- Backend `WEB_APP_URL` must match frontend domain
- Backend `PUBLIC_SITE_URL` must match frontend domain
- Frontend `VITE_API_BASE_URL` must point to backend `/api/v1`
- Frontend `VITE_SITE_URL` must match frontend canonical public domain

## MongoDB Atlas Notes

- Use a dedicated production database, not local dev data
- Add the Render outbound IP allowance strategy that fits your Atlas plan
- Verify that the backend can connect after deployment before testing auth or payments

## Razorpay Notes

- Use production Razorpay keys only in production
- The current code supports order creation and backend signature verification
- Webhook reconciliation is still a future hardening step, so verify purchase/payment flows manually after deploy

## Email Notes

- Use a verified Brevo transactional sender email in production
- Confirm signup OTP emails and password reset OTP emails work on the deployed backend

## Post-Deploy Smoke Test

1. Open the frontend homepage
2. Confirm public SEO routes load
3. Signup and verify OTP
4. Upload and parse a document
5. Generate answers and render a PDF
6. Test private PDF payment unlock
7. Test marketplace purchase flow
8. Test admin login and dashboard
