# Shenanigans

Personal portfolio and blog. SvelteKit 3, Svelte 5, Tailwind 4, shadcn-svelte, Drizzle, Supabase (Postgres, Auth, Storage), deployed on Vercel.

Start with [PLAN.md](PLAN.md): it is the build plan and the progress log. Product intent is in PRODUCT.md, requirements in SOFTWARE.md, journeys in JOURNEY.md, visuals in DESIGN.md.

## Local development

Needs [bun](https://bun.sh) and Docker Desktop (running).

```bash
bun install
cp .env.example .env        # then fill in values; see below
bun run db:start            # Supabase local stack (Postgres 54322, API 54321)
bun run db:migrate          # apply Drizzle migrations
bun run db:seed             # sample content (development only)
bun run dev
```

`bunx supabase status` prints the local URL and keys for `.env`. The local keys are public demo keys, not secrets. Real GitHub sign-in needs an OAuth app (PLAN.md H2): put its client id and secret in `supabase/.env` (git-ignored) as `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`, then set `ADMIN_GITHUB_ID` in `.env` and run `bun run db:allow-admin`.

## Commands

| Purpose            | Command                       |
| ------------------ | ----------------------------- |
| Typecheck          | `bun run check`               |
| Lint and format    | `bun run lint`                |
| Unit tests         | `bunx vitest --run`           |
| End-to-end tests   | `bunx playwright test`        |
| Build              | `bun run build`               |
| New migration      | `bun run db:generate`         |
| Apply migrations   | `bun run db:migrate`          |
| Stop local stack   | `bun run db:stop`             |

Database tests run inside rolled-back transactions against the local stack, so `db:start` and `db:migrate` must have run first.

## Environment

Variables are declared and validated in `src/env.ts`. Secrets are server-only and never reach client code.

## Deploying (Vercel + hosted Supabase)

1. Create the hosted Supabase project (PLAN.md H1). Enable only the GitHub provider (Authentication, Providers) and create the GitHub OAuth app (H2). Add `https://<site>/auth/callback` to the redirect URLs.
2. Run the migrations against it: `DATABASE_URL=<pooled or direct connection string> bun run db:migrate`, then `bun run db:allow-admin` with `ADMIN_GITHUB_ID` set to your numeric GitHub id.
3. Create the Vercel project from this repository. Set these environment variables (names only here; values come from your accounts): `DATABASE_URL`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_GITHUB_ID`, `RATE_LIMIT_SECRET`, and optionally `ORIGIN` and `VERCEL_ISR_BYPASS_TOKEN`.
4. Point `shenanigans.is-a.dev` at the Vercel project (H6).
5. Check the launch list in PLAN.md section 10, including the Supabase free-tier pausing risk (D13).

The client IP used for rate limiting comes from `getClientAddress()`, which on Vercel reads the platform-set forwarded address. Confirm after the first deploy that a request with a spoofed `X-Forwarded-For` is still counted under your real address.

## Security checks

`.github/workflows/security.yml` runs on every push to `main`, every pull request, every Monday and on demand. It needs no secrets. Five jobs, each described in SOFTWARE.md (SR-16):

- **Secrets**: gitleaks over the whole git history.
- **Dependencies**: `bun audit` (fails on high and critical) and, on pull requests, GitHub's dependency review.
- **Code analysis**: CodeQL, plus `bun run lint` and `bun run check`.
- **Build and bundle**: builds with throwaway values and fails if a server-only name or value is in the client build.
- **Security tests**: starts the local Supabase stack and runs the database, authorization, sanitizer, upload, rate-limit, header, login and error-page tests.

Dependabot proposes minor and patch updates weekly; major versions are upgraded by hand (SOFTWARE.md MR-4).

Run the same checks locally: `bun audit --audit-level=high`, `bun run lint`, `bun run check`, and the tests named in the workflow.

One-time settings on GitHub (not in the repository): under Settings, Code security, turn on Dependabot alerts, Dependabot security updates, and secret scanning with push protection; under Settings, Branches, require the five jobs as status checks on `main`.
