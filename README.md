# CareerTrack AI

Job application and interview tracking tool for students and job seekers.

## Stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: React, Vite
- Auth: email/password first, JWT access tokens plus HTTP-only refresh-token cookies
- AI provider: Gemini, to be wired in the AI phase

## Local Setup

1. Copy backend environment values:

```bash
cp backend/.env.example backend/.env
```

2. Install dependencies:

```bash
npm install
```

3. Start both apps:

```bash
npm run dev
```

Backend defaults to `http://localhost:5000`.
Frontend defaults to `http://localhost:5173`.

## Deployment Notes

Set `NODE_ENV=production`, `CLIENT_URL`, `CORS_ORIGINS`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_DOMAIN` as needed on Render/Railway/Vercel-style hosting.
