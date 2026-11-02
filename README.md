# Ledger

Personal finance dashboard: React + Vite frontend, Express API, Postgres on [Neon](https://neon.com), and sign-in with Neon Auth (managed Better Auth).

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in, from the Neon Console:
   - `DATABASE_URL`: project → **Connect** (pooled connection string)
   - `VITE_NEON_AUTH_URL`: project → **Auth** → Auth Base URL
3. First time only: `npm run db:push` to create the tables.
4. `npm run dev` and open http://localhost:3000

Google sign-in works on localhost out of the box using Neon's shared development credentials. Before going to production:

- add your production domain to Neon Auth's trusted domains and turn off **Allow Localhost**
- replace the shared Google credentials with your own OAuth client (Neon docs → Auth → Set up OAuth)

## Deploying (Vercel)

Set `DATABASE_URL` and `VITE_NEON_AUTH_URL` in the project's environment variables.

## Keeping the data safe

| Command | What it does |
| --- | --- |
| `npm run db:backup` | Consistent snapshot of every table into `backups/<timestamp>/` (git-ignored), checksummed and read back to verify. |
| `npm run db:restore -- backups/<timestamp>` | Restores into `DATABASE_URL` in one transaction. Never overwrites existing rows, and checks every row before committing. Dry run unless you add `--apply`. |
| `npm run db:link-user -- --to you@example.com` | One-time migration: moves data from the old Firebase account to your Neon Auth account. Dry run unless you add `--apply`. |

Take a backup before schema changes (`db:push`). Neon also keeps point-in-time history for each branch; the restore window depends on your plan.
