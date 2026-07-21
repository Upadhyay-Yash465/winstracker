# Setup

Everything you need to configure to run Wins with real email + a database.

## How OTP email works

On signup the app emails a 6-digit code to **the address the user typed in the
signup form** and won't create a session until they enter it. The send happens in
`lib/email.ts` → `sendOtpEmail(user.email, code)`.

**Without SMTP configured, the code is printed to the server console** (not
emailed) — fine for local testing, useless in production.

## Current state

`.env.local` holds `AUTH_SECRET` only. So right now:

- **No `MONGODB_URI`** → the app runs on an in-memory store. Accounts, wins, and
  friendships **reset every time the server restarts**.
- **No `SMTP_*`** → OTP codes are logged to the console, not emailed.

## 1. Email — Gmail SMTP (required to actually send codes)

1. Use a Gmail account and turn on **2-Step Verification**
   (Google Account → Security). App Passwords don't exist without it.
2. Google Account → Security → **App passwords** → generate one for "Mail".
   You get a 16-character password.
3. Add to `.env.local`:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=youraddress@gmail.com
   SMTP_PASS=your16charapppassword
   MAIL_FROM="Wins <youraddress@gmail.com>"
   ```

   - `MAIL_FROM` address **must match** `SMTP_USER` — Gmail rejects a from-address
     that isn't your own account. Keep the `<>` brackets (standard
     `Display Name <email>` format). Or use a bare address: `MAIL_FROM=youraddress@gmail.com`.
   - `SMTP_PASS` is the app password with **no spaces**.

## 2. Database — MongoDB (recommended; without it all data resets on restart)

1. Create a cluster (MongoDB Atlas free tier works), add a DB user, allow network
   access.
2. Add the connection string to `.env.local`:

   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
   ```

   Collections (`users`, `wins`, `friendships`) are created automatically on first
   write. The DB name is `wins-tracker` (set in `lib/data.ts`).

## 3. `AUTH_SECRET` — already set locally

Signs the session and verification cookies. Keep it. Generate a new one with:

```
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

## 4. Restart the dev server

Env vars load at boot, so after editing `.env.local` you must restart
(`npm run dev`). Then signup emails a real code instead of logging it.

## 5. Vercel (only when deploying)

Add the **same** variables in Vercel → Project → Settings → Environment Variables,
then redeploy:

`AUTH_SECRET`, `MONGODB_URI`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`MAIL_FROM`.

---

**Minimum to see a real OTP email:** step 1 + step 4. Mongo (step 2) is separate —
it's about data surviving restarts, not email.
