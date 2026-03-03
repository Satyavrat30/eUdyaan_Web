# eUdyaan Web

eUdyaan is a student-focused mental wellness platform with resources, AI support, appointments, community discussions, and account authentication.

## What’s included

- Authentication (signup, login, forgot/reset password, email verification flow)
- Resources section with cards and AI support chat
- Community posts and threaded replies
- Reddit-style voting (upvote/downvote/toggle)
- Contact and appointment pages

## Recent major updates

### Access control

- Protected features now require login (community posting/reply/voting, AI assistant actions, contact submission)
- Session helper adds redirect-to-login with `next` return support after successful sign-in
- Appointment flow now enforces:
  - Therapist must be selected before proceeding from Step 1
  - Login check before proceeding with booking flow
  - Inline Step 3 guidance shown before confirmation

### Appointments

- Added persistent appointment storage in MongoDB
- Added authenticated appointment APIs:
  - `POST /api/appointments` (create booking)
  - `GET /api/appointments` (list current user bookings)
  - `DELETE /api/appointments/:appointmentId` (cancel booking)
- Added consultant detail persistence (`consultantName`, `consultantRole`) with date/time/type
- Appointment wizard now creates real bookings and shows booking summary
- Added dedicated `My Appointments` history page with cancel actions

### Community

- Required field guidance and validation for post creation (`title`, `content`, `tags`)
- Reply UX: `Enter` submits, `Shift+Enter` inserts newline
- Server-side identity resolution for anonymous posting (don’t trust raw client identity)
- Guest fallback identity support
- XSS hardening in feed/thread rendering
- Post/reply write rate limiting
- Self-harm safety enforcement for posts and replies:
  - Detects high-risk/self-harm phrases on submit
  - Shows `RED ALERT TRIGGERED` popup with support text
  - Includes quick actions: `Call Helpline` and `Consult Doctor`
  - Blocks submission so risky post/reply is not published
  - Server-side validation also rejects risky content (`422`, `RED_ALERT_TRIGGERED`) to prevent bypass
- Voting upgraded to Reddit-style behavior:
  - Upvote and downvote arrows
  - Toggle off by clicking the same vote again
  - Switching up ↔ down adjusts score accordingly
  - One vote per user per post enforced backend-side
  - New posts start with score `1` (author default upvote)

### AI support

- Added API rate limiting and overload protection
- Improved upstream quota-limit handling (friendly 429 flow)
- Prompt/system behavior tuned for Indian student context and crisis guidance
- Added stronger high-risk phrase detection (English, Hinglish, and Hindi)
- Added safer crisis UX: high-risk user messages trigger urgent red guidance flow
- Added backend risk-signal utility + matrix script for phrase regression checks

### Admin login + dashboard

- Added admin authentication endpoints:
  - `POST /api/auth/admin/login`
  - `POST /api/auth/admin/logout`
  - `GET /api/auth/admin/me`
- Added admin-protected dashboard endpoints:
  - `GET /api/admin/dashboard/summary`
  - `GET /api/admin/dashboard/chats`
  - `GET /api/admin/dashboard/risk-alerts`
  - `GET /api/admin/dashboard/community`
  - `GET /api/admin/dashboard/contacts`
  - `GET /api/admin/dashboard/appointments`
- Added AI client risk event ingestion endpoint:
  - `POST /api/ai/risk-alert`
- Added admin UI pages:
  - `/admin/admin-login.html`
  - `/admin/admin-dashboard.html`
- Dashboard visibility now includes:
  - AI chats (who talked, message/reply, language, seriousness)
  - Risk alerts from AI support and community red-alert blocking
  - Community posts and replies with user/anonymous IDs
  - Contact messages and aggregate summary counters
- Risk alert source filtering in dashboard:
  - `All Sources`
  - `AI Assistant Chatbot`
  - `Community`
- Improved dashboard reliability:
  - Fresh API reads on refresh/load (cache-busting + no-store fetch)
  - Separate rate limiter bucket for AI risk-alert logging to avoid dropped alerts under chat traffic

### Crisis safety + language behavior (Resources chatbot)

- Shared backend detector in `backend/utils/riskSignals.js`
- Risk phrase validation script in `backend/scripts/risk-signal-matrix.js`
- NPM script support:
  - Root: `npm run test:risk`
  - Backend: `npm run test:risk --prefix backend`
- Language-aware responses for user conversation style (English/Hinglish/Hindi)

### Homepage + navigation

- Fixed CTA destinations (Get Started, Book Appointment, Home links)
- `eUdyaan` logo is clickable to Home across pages
- Removed unintended underline styling on logo links

### Resources robustness

- Safer API base handling for file/backend contexts
- Escaping/sanitization for dynamic rendering and embeds
- Better resilience for invalid state and report parsing

### Testing upgrades

- Added comprehensive end-to-end API test harness:
  - `npm run test:hardcore` (root)
  - `npm run test:hardcore --prefix backend`

## Tech stack

- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express, Mongoose
- Database: MongoDB

## Setup

### 1) Install backend dependencies

```bash
npm install --prefix backend
```

### 2) Configure environment

Create/update `backend/.env` with required keys:

```env
MONGO_URI=...
PORT=5000
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant

# Optional email/auth settings
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_PASS=...
FRONTEND_URL=http://localhost:5000
ADMIN_KEY=...
ADMIN_EMAIL=admin@eudyaan.local
ADMIN_PASSWORD=...
```

### 3) Run

From project root:

```bash
npm start
```

Open:

```text
http://localhost:5000
```

## Notes

- Keep secrets only in `.env` files; never commit real keys.
- If dependencies are missing, run `npm install --prefix backend` again.
- If server doesn’t pick up latest route changes, restart backend.

## Quick validation

Run this after updating safety patterns:

```bash
npm run test:risk
```
