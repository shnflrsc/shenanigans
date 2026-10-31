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
