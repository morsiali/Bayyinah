# Bayyinah | بيّنة

[![CI](https://github.com/morsiali/Bayyinah/actions/workflows/ci.yml/badge.svg)](https://github.com/morsiali/Bayyinah/actions/workflows/ci.yml)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/morsiali/Bayyinah?quickstart=1)

**Turn a payment request into an evidence-backed decision.** — **حوِّل طلب الدفع إلى قرار موثّق.**
A verification workflow for small businesses in the UAE: invoice payments, supplier bank account changes and new beneficiaries — from the message you received to a reviewed, documented decision.

> Bayyinah is a working name. It supports verification and decision documentation only. It does not execute payments, authorize transfers, prove account ownership or guarantee fraud detection.

---

## Live links

| What | Link |
|---|---|
| Public website, request check and Demo Mode — English (GitHub Pages) | **https://morsiali.github.io/Bayyinah/** |
| Same, in Arabic — العربية | **https://morsiali.github.io/Bayyinah/ar/** |
| Interactive workflow map (every step, branch and loop) | **https://morsiali.github.io/Bayyinah/workflow/** |
| Full live app with sign-in, cases and AI (GitHub Codespaces) | **https://codespaces.new/morsiali/Bayyinah?quickstart=1** |

The whole interface is available in **English and Arabic (right-to-left)** — switch with the language button at the top of any page; the choice is remembered, and browsers set to Arabic open in Arabic.

The Pages site is static: sign-in and workspaces need the server, so their links there lead to a page explaining how to open the full app. It is rebuilt automatically on every push to `main`.

## Run it on GitHub (nothing to install)

1. Click **Open in GitHub Codespaces** above (or **Code → Codespaces → Create codespace on main**).
2. Wait for the first start (about 3–5 minutes): it installs packages, creates the database with sample data, builds and starts the app.
3. The app opens in a new browser tab. If it doesn't, open the **Ports** tab and click the address next to port **3000**.
4. Sign in with a sample account (table below).

- **AI analysis:** add your key once as a Codespaces secret — GitHub → *Settings → Codespaces → Secrets → New secret*, name `ABACUSAI_API_KEY` (or `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`), and give this repository access. Rebuild or restart the codespace. Without a key the offline analyzer is used.
- **Sharing:** the address is private to your GitHub account by default. To show someone else, right-click port 3000 in the **Ports** tab → *Port Visibility → Public*. The link works only while the codespace is running.
- **Cost:** Codespaces usage counts against your GitHub account's monthly allowance; stop the codespace when you're done (*github.com/codespaces*).
- **Tests:** every push runs the full suite automatically (unit, integration, production build, browser tests) under **Actions**.

## Run it on Windows (5 minutes)

1. Install **Node.js 20 or newer** (LTS) from <https://nodejs.org>.
2. Double-click **`setup.bat`** — installs packages, creates `.env`, the database and fictional sample data.
3. Double-click **`start.bat`** — opens <http://localhost:3000>.

Same thing from a terminal (Windows, macOS or Linux):

```bash
npm install
npm run setup      # .env + database + seed data
npm run dev        # http://localhost:3000
```

### Sample accounts (fictional, password `Bayyinah!2026`)

| Email | Organization | Roles |
|---|---|---|
| `omar@alwaha.example` | Al Waha Trading LLC | Preparer |
| `sara@alwaha.example` | Al Waha Trading LLC | Reviewer |
| `layla@alwaha.example` | Al Waha Trading LLC | Organization admin + Reviewer |
| `hana@desertrose.example` | Desert Rose Interiors | All roles (second organization, for isolation) |
| `ops@bayyinah.example` | — | Platform operations |

The seed leaves one case at each stage: approved (with report), waiting for independent verification, ready for review, and a draft. Reset everything with `npm run db:reset`.

---

## What's in the product

| Experience | Route | Who |
|---|---|---|
| Public website with a working in-browser request check | `/` | Anyone |
| Demo Mode (fictional data, simulated AI, identity switcher, reset) | `/demo` | Anyone |
| Registration, sign-in, password recovery, invitation acceptance | `/signup`, `/login`, `/forgot-password`, `/invite/…` | Anyone |
| Case preparation workspace | `/app/{org}/prepare` | Preparer |
| Review workspace | `/app/{org}/review` | Reviewer |
| Organization administration (suppliers + versions, members, invitations, audit, settings) | `/app/{org}/admin` | Organization admin |
| Decision Passport (case workspace) and printable report | `/app/{org}/cases/{id}` | Members, actions by role |
| Platform operations (metadata only, no case content) | `/platform` | Provisioned platform admins |

**Workflow:** see `/workflow` for the interactive map (data in `lib/workflow.ts`, checked against the server's status transitions by `tests/unit/workflow.test.ts`). In short: create/select supplier → create case → add source (paste text or text-based PDF) → analysis (AI or local) → review/correct extraction → deterministic comparison → bounded preparation agent → human independent verification → submit for review → separate reviewer decides → report + audit history.

## Architecture

One Next.js 15 (App Router, TypeScript) modular monolith.

```
app/                 pages and API route handlers (thin)
lib/services/        business logic — the only place rules, authorization and transitions live
  access.ts          membership/role resolution, org-scoped loading
  workflow.ts        the single case status transition service (optimistic concurrency)
  requirements.ts    readiness requirements computed from persisted records
  cases.ts           cases, evidence intake, versions, submit/withdraw/reopen
  analysis.ts        model call → strict schema → citation check → rules; corrections
  agent.ts           bounded agent: 7 allow-listed tools, limits, execution records
  verification.ts    human verification records
  review.ts          separate-reviewer decisions with stale-version checks
  suppliers.ts orgs.ts accounts.ts platform.ts retention.ts
lib/analysis/        rules engine, local analyzer, Zod output schema
lib/ai/provider.ts   replaceable model provider (Anthropic, OpenAI-compatible, Abacus, local)
components/          UI (design system in components/ui.tsx)
prisma/schema.prisma data model (SQLite locally; PostgreSQL in production)
```

- **Languages:** `lib/i18n` — English text is the key, Arabic lives in `lib/i18n/ar/*`; server messages with values are translated by patterns in `lib/i18n/ar-patterns.ts`. `tests/unit/i18n.test.ts` fails if any interface string lacks an Arabic translation.
- **Design:** after penti.ai — DM Sans and JetBrains Mono for Latin text, Cairo for Arabic; tokens in `tailwind.config.ts` and `app/globals.css`.
- **Auth:** email + password (bcrypt), signed HTTP-only session cookie (JWT via `jose`), sessions revoked on password reset.
- **Storage:** private files under `STORAGE_DIR`, served only to members of the owning organization.
- **AI:** set one API key in `.env`. Without a key, the deterministic local analyzer runs and is labelled as such everywhere — it is never presented as AI.

## Configuration

See `.env.example`. Key settings: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `STORAGE_DIR`, `AI_PROVIDER` / API keys / `AI_MODEL`, `SHOW_DEMO_ACCOUNTS`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run setup` | Create `.env`, database and seed data |
| `npm run dev` / `npm run build && npm start` | Development / production |
| `npm run db:reset` | Delete local data and reseed |
| `npm run platform-admin -- grant <email>` | Privileged platform-admin provisioning (server only) |
| `npm run retention` | Apply each organization's retention period (schedule daily) |
| `npm test` | Unit + integration tests (Vitest, real SQLite test database) |
| `npm run test:e2e` | Browser tests (Playwright): link crawler + full live workflow |
| `node scripts/build-static.mjs` | Build the static public site (website + Demo Mode) into `site-out/` |
| `npm run eval` | Run the labeled Arabic/English AI evaluation set against the configured provider |

## Documentation

- [docs/OPERATIONS.md](docs/OPERATIONS.md) — deployment, domain/HTTPS, PostgreSQL, backups, restore, updates, rollback, production checklist
- [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) — what is stored and processed, retention, controls, pre-launch privacy/legal checklist
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md) — role and permission matrix
- [docs/COMPLETION.md](docs/COMPLETION.md) — capability-by-capability status, tests, limitations, readiness
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — three-minute demonstration
