
# eUdyaan Web – Branch Change Summary

This README summarizes the work done in branch `feature/community-post-fixes`.

## 1) Community section improvements

- Added visible required indicators in the post composer.
- Enforced mandatory fields for post creation: title, content, and tags.
- Improved validation behavior so users are focused to the first missing field.
- Updated reply input behavior:
  - `Enter` submits the reply
  - `Shift + Enter` creates a new line
- Added backend-level checks to reject post creation when required fields are missing.
- Added schema-level validation to require at least one tag.

## 2) Login and authentication updates

- Upgraded signup flow with stronger password policy validation (minimum length, uppercase, lowercase, numeric, special character).
- Added secure password hashing before account creation and password reset.
- Introduced email verification flow for signup using token-based verification links.
- Added login gating for unverified accounts (when email verification is configured).
- Improved login responses and UX messages for:
  - unregistered email
  - incorrect password
  - successful login state
- Added "forgot password" flow that sends password reset links.
- Added token-based password reset flow with password strength checks.
- Added frontend password strength meter and real-time strength labels.
- Added confirm-password validation in signup/reset flows.
- Updated login/signup UI for better usability (clear labels, visibility toggle, navigation links, forgot password access).
- Added verified-account success handling on login screen after email confirmation.

## 3) AI support prompt update

- Updated the support assistant behavior to align with Indian student context and local crisis guidance.

## 4) Notes

- The branch currently contains both committed updates and additional in-progress auth/login updates.
- Dependency/vendor directory changes are present locally; keep commits focused on application source and lockfiles.

## 5) Auth setup notes (Gmail + bcrypt)

- Authentication/email flow is configured to use Gmail SMTP with these env keys:
  - `EMAIL_SERVICE=gmail`
  - `EMAIL_USER=...`
  - `EMAIL_PASS=...` (16-char Google App Password)
  - `FRONTEND_URL=http://localhost:5000`
  - `ADMIN_KEY=...` (long random secret)
- Password security uses bcrypt hashing for signup and password reset.
- Required auth dependencies are installed/used: `bcryptjs` and `nodemailer`.

## 6) Gmail App Password requirements

- Sign in to `myaccount.google.com`.
- Enable **2-Step Verification** in Security settings.
- Open **App Passwords**, create one for Mail, and copy the generated 16-character password.
- Paste that value into `EMAIL_PASS`.

## 7) Existing users note

- Older users stored with plain-text passwords will not authenticate after bcrypt-based login is enabled.
- Testing approach: clear existing users and re-register accounts.
- Production approach: run a one-time migration to hash existing passwords.

## 8) Anonymous admin lookup usage

- Use your configured `ADMIN_KEY` to resolve anonymous post IDs in admin lookup requests.
- Example pattern:
  - `GET /api/auth/admin/lookup-anonymous?anonymousId=ANON-123456&adminKey=YOUR_ADMIN_KEY`

## 9) AI Support Assistant (upgraded behavior)

- AI support flow was enhanced from a basic single-response chat to a richer support pipeline.
- The assistant context is aligned to Indian student realities (exam pressure, placement anxiety, family expectations, hostel life).
- Crisis handling is stronger with Indian emergency and helpline guidance in high-risk situations.
- Emotion-aware response behavior was introduced so replies better match user mood and urgency.
- Multilingual/Hinglish-friendly handling was considered in support-chat behavior.

## 10) How to run the project

- Start MongoDB (local service) or ensure your Atlas URI is valid.
- Set required backend env values (`MONGO_URI`, `GROQ_API_KEY`, `PORT`, plus optional email keys).
- Install backend dependencies and run the backend server.
- Open the app through backend host URL (`http://localhost:5000`) instead of opening HTML directly.

## 11) Common setup issues + fixes

- **Mongo env syntax error in code**: keep DB URI in env as `MONGO_URI`, never paste raw URI into JavaScript conditionals.
- **Gmail 535 login failures**: use Google App Password (16-char), not your normal Gmail password.
- **If App Password is unavailable**: temporarily disable email verification by removing/commenting email env keys for local development.
- **If old values keep loading**: stop server fully, reopen terminal, restart backend so new env values are picked up.

## 12) Security and ops reminders

- Keep secrets only in env files; never commit real keys/passwords to source control.
- Rotate credentials immediately if they were exposed accidentally.
- Use migration strategy for legacy plain-text passwords before production rollout.
