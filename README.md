# eUdyaan — Mental Wellness Web App

A mental wellness platform for Indian college students with AI chat support, community posts, appointment booking, and admin oversight.

---

## Tech Stack
- **Backend:** Node.js + Express, MongoDB/Mongoose
- **Frontend:** Vanilla HTML/CSS/JS
- **AI:** Groq API (LLaMA llama-3.1-8b-instant)
- **Email:** Nodemailer (Gmail App Password)

---

## Setup

### 1. Install dependencies
```bash
cd backend && npm install
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Fill in MONGO_URI, GROQ_API_KEY, email settings, etc.
```

### 3. Generate admin password hash (Fix #1)
Admin passwords are stored as bcrypt hashes — never in plaintext.
```bash
node backend/scripts/hash-admin-password.js yourpassword
# Copy the output into backend/.env as ADMIN_PASSWORD_HASH=...
```

### 4. Set the anonymous ID secret (Fix #4)
Generate a random secret for HMAC-based anonymous IDs:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output into backend/.env as ANON_ID_SECRET=...
```

### 5. Start the server
```bash
cd backend && node server.js
# Visit http://localhost:5000
```

---

## Security Improvements (v3)

| # | Fix | Detail |
|---|-----|--------|
| 1 | Admin password hashed | `ADMIN_PASSWORD_HASH` bcrypt hash in `.env`. Use `scripts/hash-admin-password.js` to generate. |
| 2 | Server-side user sessions | Login returns a `sessionToken`. Stored in `localStorage` and sent as `Authorization: Bearer <token>` on all API calls. Sessions stored in MongoDB `UserSession` collection with TTL auto-expiry. |
| 3 | Tokens stored in MongoDB | `PendingVerification` and `PasswordResetToken` collections replace in-memory Maps. Survive server restarts. Auto-deleted via MongoDB TTL index. |
| 4 | HMAC anonymous IDs | `makeAnonymousId()` now uses `HMAC-SHA256` with `ANON_ID_SECRET`. Non-reversible, collision-resistant, shared from `utils/anonymousId.js`. |
| 5 | Login rate limiting | `/api/auth/login` is rate-limited (10 attempts / 15 min per IP+email). |
| 6 | Signup rate limiting | `/api/auth/signup` is rate-limited (5 attempts / hour per IP). |
| 7 | `riskCategory` in chat logs | `ChatSupportLog` now stores `riskCategory: "none" \| "self_harm" \| "violence"`. |
| 8 | Past date validation | Appointments cannot be booked for past dates. |
| 9 | CORS restricted | `cors()` now only allows origins listed in `ALLOWED_ORIGINS` env var. |
| 10 | HTML sanitization | All user-submitted text (posts, replies, contact messages) has HTML tags stripped before storage to prevent XSS. |
| 11 | Shared `makeAnonymousId` | Single `utils/anonymousId.js` utility used everywhere. Removed 3 duplicate implementations. |
| 12 | Community post pagination | `GET /api/community/posts` supports `page` and `limit` query params. Returns `pagination` metadata. |
| 13 | `riskCategory` in chat logs | (See #7 above — same fix.) |
| 14 | Password change notification | A confirmation email is sent to the user when their password is successfully reset. |
| 15 | Resend verification email | `POST /api/auth/resend-verification` endpoint added. Shown as a link after signup when email verification is required. |
| 16 | Tech debt documented | All migration paths are now documented here and in `.env.example` with clear instructions. |
| 17 | Mongo DNS resiliency | Optional `DNS_SERVERS` env var added so Node can use custom DNS resolvers when local DNS blocks Atlas SRV lookups. |
| 18 | Community full history + stable tags | Community feed now supports `GET /api/community/posts?limit=all` and frontend requests all posts so older posts remain visible; tag dropdown options no longer collapse after selecting one tag. |

---

## Environment Variables

See `backend/.env.example` for the full list with descriptions.

Key variables:
- `MONGO_URI` — MongoDB connection string
- `GROQ_API_KEY` — Groq AI key
- `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` — Admin credentials (hash generated via script)
- `ANON_ID_SECRET` — Secret for anonymous ID HMAC
- `ALLOWED_ORIGINS` — Comma-separated list of allowed frontend origins (CORS)
- `FRONTEND_URL` — Used in email verification and password reset links
- `DNS_SERVERS` — Optional comma-separated DNS servers for Node.js resolver override (example: `8.8.8.8,1.1.1.1`)

---

## Troubleshooting

- MongoDB Atlas SRV DNS error (`querySrv ECONNREFUSED` or DNS timeout):

```bash
# backend/.env
DNS_SERVERS=8.8.8.8,1.1.1.1
```

Then restart:

```bash
npm start
```

- Community feed should show complete history:

```bash
GET /api/community/posts?sort=recent&category=all&days=all&tag=all&limit=all
```

If the browser still shows stale filter behavior, do a hard refresh (`Ctrl+F5`).

---

## Testing

- Manual regression checklist (105 tests): `docs/manual-test-list.md`
- Tick-off checklist version (checkboxes): `docs/manual-test-checklist.md`
- Core regression:

```bash
npm run test:risk
npm run test:hardcore
```

- Full UI language smoke test (14 languages):

```bash
npm run test:ui-languages
```

- Remaining checklist automation (pre-restart phase):

```bash
npm run test:checklist-remaining
```

- Remaining checklist post-restart phase (`#102`, `#103`):

```bash
node backend/scripts/checklist-batch-final-remaining.js --phase=post
```

- Final inbox-backed email checks (`#9`, `#42`):

```bash
npm run test:checklist-email
```

> Note: `test:checklist-email` requires valid `EMAIL_USER` and `EMAIL_PASS` (Gmail IMAP enabled) so mailbox delivery can be verified.
