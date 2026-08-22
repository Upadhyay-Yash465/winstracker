# winstracker

A wins tracker I made for my friends and family. Next.js + MongoDB, dark parchment aesthetic.

## Run locally

```
npm install
npm run dev
```

Without `MONGODB_URI` set, the app uses an in-memory store so you can try it
immediately — accounts and wins reset when the dev server restarts.

## Connect MongoDB

1. Copy `.env.example` to `.env.local`.
2. Set `MONGODB_URI` to your Atlas connection string.
3. Set `AUTH_SECRET` to a long random string.

Collections (`users`, `wins`, `friendships`) are created automatically on first write.

## Email verification

Signup emails a 6-digit code; you enter it before your account is active.
Set the `SMTP_*` / `MAIL_FROM` vars (see `.env.example`) to send real mail —
for Gmail, use an App Password. **Without them set, the code is printed to the
server console** so you can test the flow locally.

## Friends & sharing

Add friends by email (mutual request → accept). Each win has a visibility:
`Private` (only you), `Friends`, or `Anyone on Wins` (any signed-in user). Visit
`/u/<id>` to see what a given person shares with you. Edit your name, bio, and
password at `/profile`.

## Deploy to Vercel

Push to a Git repo, import it in Vercel, and add `MONGODB_URI`, `AUTH_SECRET`,
and the `SMTP_*` / `MAIL_FROM` variables in Vercel's environment settings.
