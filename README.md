# ExamNova AI

ExamNova AI is a monorepo for an exam-preparation platform that lets students upload study material, parse documents, detect likely exam questions, generate compact answer drafts, render final PDFs, unlock private PDFs via payment, sell PDFs in a marketplace, manage wallet earnings, and run the platform through an admin console.

## What Is Included


- Student authentication with OTP verification and password reset
- Document upload, parsing, and document library
- AI-assisted question detection and answer generation flow
- Compact PDF rendering pipeline
- Private PDF payment unlock flow
- Public marketplace with browse, detail, selling, and purchasing flows
- Buyer library, seller wallet, and withdrawal request flows
- Admin dashboard, moderation, analytics, uploads, and upcoming locked PDFs
- SEO-ready public landing pages, sitemap, robots, and structured metadata

## Tech Stack

- Frontend: React, React Router, Vite
- Backend: Node.js, Express, Mongoose
- Database: MongoDB Atlas
- Payments: Razorpay
- Mail/OTP: Nodemailer-compatible SMTP
- PDF parsing/rendering: `pdf-parse`, `mammoth`, `pdfkit`

## Monorepo Structure

- [apps/web](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web): React frontend
- [apps/api](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api): Express API
- [docs](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\docs): deployment, QA, and handoff notes
- [package.json](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\package.json): workspace scripts

## Local Setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Create environment files:

- Copy [apps/api/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api\.env.example) to `apps/api/.env`
- Copy [apps/web/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web\.env.example) to `apps/web/.env`

3. Fill in real values for:

- MongoDB Atlas connection string
- JWT secrets
- SMTP credentials
- Razorpay credentials
- AI provider API key
- local/public URLs

4. Start the API:

```bash
npm run dev:api
```

5. Start the frontend:

```bash
npm run dev:web
```

6. Open the frontend in your browser:

```text
http://localhost:5173
```

## Workspace Scripts

Run from the repo root:

```bash
npm run dev:web
npm run dev:api
npm run build
npm run lint
npm run typecheck
```

App-specific scripts:

- [apps/api/package.json](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api\package.json)
- [apps/web/package.json](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web\package.json)

## Environment Guides

- Backend env template: [apps/api/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\api\.env.example)
- Frontend env template: [apps/web/.env.example](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\apps\web\.env.example)

## Deployment And QA Docs

- Render deployment guide: [docs/render-deployment.md](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\docs\render-deployment.md)
- Final QA checklist: [docs/qa-checklist.md](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\docs\qa-checklist.md)
- Developer handoff notes: [docs/developer-handoff.md](C:\Users\pkper\OneDrive\Desktop\ExamNova AI\docs\developer-handoff.md)

## Current Status

The platform is feature-rich and structured for deployment, but there are still known production-readiness items:

- Full end-to-end runtime verification is still needed
- In-memory rate limiting should become shared/distributed in production
- Payment webhook reconciliation is still a future hardening step
- Lint/typecheck scripts are placeholders today

## Recommended First Test Pass

After local setup, test in this order:

1. Signup, OTP, login, logout
2. Upload and parse a document
3. Detect questions
4. Generate answers
5. Render a final PDF
6. Test private PDF payment unlock
7. Test marketplace listing and purchase
8. Test wallet, withdrawals, and admin actions

## Important Note

This README is aligned to the implemented codebase, but the project has not been fully runtime-verified in this environment during this handoff pass. Treat the QA checklist as required before production launch.

# ExamnovaAi
