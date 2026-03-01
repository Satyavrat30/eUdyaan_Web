# eUdyaan Web

eUdyaan is a student-focused mental wellness platform with resources, AI support, appointments, community discussions, and account authentication.

## What’s included

- Authentication (signup, login, forgot/reset password, email verification flow)
- Resources section with cards and AI support chat
- Community posts and threaded replies
- Reddit-style voting (upvote/downvote/toggle)
- Contact and appointment pages

## Recent major updates

### Community

- Required field guidance and validation for post creation (`title`, `content`, `tags`)
- Reply UX: `Enter` submits, `Shift+Enter` inserts newline
- Server-side identity resolution for anonymous posting (don’t trust raw client identity)
- Guest fallback identity support
- XSS hardening in feed/thread rendering
- Post/reply write rate limiting
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

### Homepage + navigation

- Fixed CTA destinations (Get Started, Book Appointment, Home links)
- `eUdyaan` logo is clickable to Home across pages
- Removed unintended underline styling on logo links

### Resources robustness

- Safer API base handling for file/backend contexts
- Escaping/sanitization for dynamic rendering and embeds
- Better resilience for invalid state and report parsing

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
