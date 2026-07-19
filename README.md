# winstracker

A wins tracker I made for my Girlfriend. Next.js + MongoDB, dark parchment aesthetic.

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

Collections (`users`, `wins`) are created automatically on first write.

## Deploy to Vercel

Push to a Git repo, import it in Vercel, and add `MONGODB_URI` and
`AUTH_SECRET` as environment variables.
