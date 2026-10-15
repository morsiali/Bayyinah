# Operations

## Deployment target

**Recommended for a controlled pilot:** one Linux VM (or a Windows server) running Node.js 20+ behind an HTTPS reverse proxy, with SQLite and file storage on a backed-up disk. This keeps everything in one place and is enough for a pilot with a handful of organizations.

Options included:

- **Node directly:** `npm ci && npm run build && npm start` (port 3000). Run under a service manager (systemd, NSSM on Windows, or pm2).
- **Docker:** `docker compose up -d --build` uses `Dockerfile` + `docker-compose.yml` and keeps the database and files on the `bayyinah-data` volume. *The Docker files are provided but were not built or run during development (no Docker available).*

No paid resources are created by this repository.

## Production environment

Set in `.env` (never commit it):

| Variable | Production value |
|---|---|
| `APP_URL` | `https://your-domain` (enables `Secure` cookies and correct invitation links) |
| `AUTH_SECRET` | 64 random hex characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `DATABASE_URL` | SQLite file on a persistent disk, or PostgreSQL (below) |
| `STORAGE_DIR` | Absolute path on a persistent, backed-up disk |
| `SHOW_DEMO_ACCOUNTS` | `false` |
| AI provider key | One of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ABACUSAI_API_KEY` (+ optional `AI_MODEL`) |

Do **not** run `npm run setup`/seed on production data — the seed creates fictional accounts with a published password.

## Domain and HTTPS

1. Point an `A` record for your domain at the server.
2. Put a reverse proxy in front of port 3000 with a TLS certificate — e.g. Caddy (`your-domain { reverse_proxy localhost:3000 }` obtains certificates automatically) or nginx + certbot.
3. Set `APP_URL=https://your-domain` and restart.

## PostgreSQL instead of SQLite

1. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL="postgresql://user:pass@host:5432/bayyinah?sslmode=require"`.
3. `npx prisma db push` (or adopt migrations with `npx prisma migrate dev --name init` and `migrate deploy` in production).

Authorization is enforced in the application service layer (every query is scoped by the caller's verified organization membership). If you also want database-level row security on PostgreSQL, add RLS policies keyed on `orgId`; this is not included.

## Platform administrator provisioning (privileged)

Public registration never grants platform access. On the server:

```bash
npm run platform-admin -- grant ops@yourcompany.ae     # the account must already exist
npm run platform-admin -- revoke ops@yourcompany.ae
```

Each grant/revoke is written to the platform admin activity log.

## Scheduled jobs

Run `npm run retention` daily (cron, or Windows Task Scheduler) to remove stored files and document text from cases closed longer than each organization's retention period. Decisions and audit records are kept.

## Backups

SQLite: back up the database file and `STORAGE_DIR` together.

```bash
sqlite3 prisma/prod.db ".backup 'backup/bayyinah-$(date +%F).db'"   # safe while running
tar czf backup/storage-$(date +%F).tgz storage/
```

PostgreSQL: `pg_dump -Fc` plus the storage directory. Keep backups off the server and encrypted.

## Restore

1. Stop the app.
2. Replace the database file (or `pg_restore`) and the storage directory with the same-day backup pair.
3. Start the app and check `GET /api/health` returns `{"status":"ok"}`.

*Restoration has not been tested as part of this delivery. Test it before relying on it.*

## Updates and rollback

Update: back up → `git pull` (or copy the new release) → `npm ci` → `npx prisma db push` → `npm run build` → restart.
Rollback: stop → restore the previous release folder → if the schema changed, restore the database backup taken before the update → restart.

## Monitoring

- `GET /api/health` → database status and active analysis provider.
- Server logs carry error reference IDs (`ERR-XXXXXXXX`) that users see in error messages; logs never contain document text, passwords or keys.
- `/platform` shows failed model calls, failed/stopped agent runs and usage.

## Operational limits

Configurable at `/platform/settings`: upload size (default 10 MB), cases per organization, analyses per organization per day, characters analyzed per case, agent tool calls (12) and time (90 s), model timeout (60 s), invitation validity (7 days). The login throttle is in-memory (per process); use a shared store if you run several instances.

## Production checklist

- [ ] `APP_URL` is https and `AUTH_SECRET` is fresh and secret
- [ ] `SHOW_DEMO_ACCOUNTS=false`; no seed data in production
- [ ] Database and storage on persistent, backed-up disks; restore tested
- [ ] AI provider key set; provider/model confirmed on a case page; data-processing terms with the provider reviewed
- [ ] Platform admin provisioned via CLI; default seed accounts absent
- [ ] Retention job scheduled
- [ ] Privacy notice and terms replaced with legally reviewed text (see SECURITY_PRIVACY.md)
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` set to a real mailbox
