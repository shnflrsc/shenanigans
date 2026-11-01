# PLAN.md: Build Shenanigans

Written 2026-10-31. Sources: PRODUCT.md, SOFTWARE.md, JOURNEY.md, DESIGN.md (all present in repo root), and the two design canvases (public: claude.ai/artifact/1o6D5bF6KP81fTvtCuxao9, admin: claude.ai/artifact/5bEZAgoknqAVGzw4kPnVYD). The canvases were readable; their board lists and handoff notes are folded in below. The original prompt that asked for this plan is kept in `PLAN.prompt.md`.

DESIGN.md exists, so there is no "import DESIGN.md" task. DESIGN.md still says "Astro + Svelte islands" and mentions reactions, comments and a newsletter; those parts are stale (see Decisions D1).

## 1. How to use this plan

You are a fresh agent with no memory. This file plus the repository is the whole state.

Working loop:
1. Read this file top to bottom, then the Progress log (section 12) and Blockers (section 10).
2. Pick the first unchecked task (`- [ ]`) whose dependencies are all ticked and which is not listed in Blockers.
3. Read the sources it names (requirement IDs in SOFTWARE.md, the design boards in section 8).
4. Implement it. Stay inside the task.
5. Run its Verify step plus `bun run check` and `bun run lint`.
6. Tick it: `- [x] ... (done YYYY-MM-DD)`.
7. Commit (one commit per task, message `Mx-y: goal`). Initialise git first if the repo has none (task M0-1).
8. Append one line to the Progress log.
9. Repeat until no unchecked, unblocked task remains. Then report every Blocker together.

If a task cannot be finished: leave it unchecked, add `BLOCKED` to its line, write what is needed under Blockers, and move on. If part of a task is blocked, finish the rest, tick it with a note, and log the remainder as a new `-b` task.

## 2. Working rules

- Package manager: bun. Never use npm/pnpm to install. (`package.json` scripts still say `npm run`; M0-3 fixes that.)
- Svelte 5 runes only. Strict TypeScript. No `any` without a comment.
- Zod validates every server boundary: form actions, endpoints, query params, env.
- Secrets only through server-only env (`$app/env/private` or `$env/static/private`; SvelteKit 3 in this repo uses `$app/env/private` and `src/env.ts` `defineEnvVars`, follow that pattern). Never in client code, never committed. Never commit `.env`. Keep `.env.example` current.
- No scope beyond the docs. No silent spec changes: write proposals in section 11.
- Colors, sizes, radii, shadows only from DESIGN.md tokens. No hard-coded hex outside the token file.
- Small commits, one per task. Never push unless told.
- Verify library APIs against current official docs when a task says "verify when implementing". SvelteKit 3, Vite 8 and TS 6 are newer than most memory.
- Every UI task: run the ui-consistency flow (finding-patterns checklist from already-built pages, then verifying) as far as available.

Commands (run from repo root):

| Purpose | Command |
|---|---|
| Typecheck | `bun run check` |
| Lint + format check | `bun run lint` |
| Unit tests (server + client projects) | `bun run test:unit -- --run` |
| E2E | `bunx playwright test` (builds and previews on port 4173) |
| Build | `bun run build` |
| Generate migration | `bun run db:generate` |
| Apply migrations | `bun run db:migrate` |
| Local database | `bun run db:start` (Docker) or the Supabase local stack, see M2-1 |

## 3. Current scaffold (verified by reading)

SvelteKit 3, Svelte 5 runes forced, Vite 8, TS 6, Tailwind 4 (forms, typography), adapter-vercel (configured inside `vite.config.ts`, there is no `svelte.config.js`), enhanced-img, Drizzle with `postgres`, placeholder `task` table, compose.yaml (plain Postgres), Vitest (client browser project, server node project), Playwright (`*.e2e.ts`, builds then previews on 4173), `#lib` alias. Demo page, `src/lib/vitest-examples/`, `page.svelte.e2e.ts`, and the `task` table are to be deleted.
Not present: shadcn-svelte, Supabase packages, Zod, markdown pipeline, real schema, real routes. Environment note: Docker Desktop is installed but was not running on 2026-10-31; Supabase CLI is not installed.

## 4. Milestones and tasks

Format: **ID** goal. Touches / Covers / Design / Deps / Accept / Verify.

### M0 Cleanup and tooling

- [x] **M0-1** Initialise git and baseline commit. Touches: repo root. Covers: n/a. Deps: none. Accept: `git status` clean, `.env` ignored. Verify: `git ls-files | grep -c "^.env$"` is 0. (done 2026-10-31)
- [x] **M0-2** Remove demo: `src/lib/vitest-examples/`, `src/routes/page.svelte.e2e.ts`, demo `+page.svelte` content, `task` table. Touches: those files. Deps: M0-1. Accept: check passes with an empty home route. Verify: `bun run check`. (done 2026-10-31)
- [x] **M0-3** Fix scripts to bun (`test`, `test:e2e`, `playwright.config.ts` webServer command), add `typecheck` alias none needed. Touches: package.json, playwright.config.ts. Deps: M0-2. Accept: `bun run build` and `bunx playwright test` start without npm. Verify: run both. (done 2026-10-31)
- [x] **M0-4** Add Zod, set up `src/lib/server/env.ts` pattern with Zod-validated env (extend `src/env.ts`). Covers: SR-5, SR-7. Deps: M0-2. Accept: missing env fails fast with a clear message. Verify: unit test on the env parser. (done 2026-10-31)
- [x] **M0-5** Document local dev in README (Supabase local stack, env, commands). Covers: n/a. Deps: M2-1 decision. Accept: a fresh clone can follow it. Verify: read-through. (done 2026-10-31)

### M1 Design foundations

- [x] **M1-1** Tokens: put the DESIGN.md token block in `src/routes/layout.css` (or `src/lib/styles/tokens.css`), map to Tailwind 4 `@theme` (colors, radii, spacing, fonts, shadows, type styles as utilities), light on `:root`, dark on `[data-theme="dark"]`. Covers: MR-1, UR-1, UR-5, MR-3. Design: Design system. Deps: M0-2. Accept: no hex outside the token file. Verify: grep for `#[0-9a-f]{3,6}` outside tokens returns nothing; unit render test of a token-styled element. (done 2026-10-31)
- [x] **M1-2** Fonts: self-host Space Grotesk (400-700) and Space Mono (400, 700) with `font-display: swap`, preload the primary weights. Covers: PR-3. Deps: M1-1. Accept: no Google request at runtime (CSP friendly). Verify: network panel / Playwright request check. Fonts must be downloaded: use the `@fontsource` packages via bun (allowed, this is part of the task). (done 2026-10-31)
- [x] **M1-3** shadcn-svelte setup for Tailwind 4 and Svelte 5 (verify when implementing), alias `#lib/components/ui`, map its CSS variables (`--background`, `--primary`, ...) onto the Shenanigans tokens so components need no restyling. Add Button, Input, Textarea, Select, Switch, Tabs, Table, Badge, DropdownMenu, Popover, Command, AlertDialog, Alert, Sonner, Progress, Card. Covers: MR-1, MR-3, UR-1. Deps: M1-1. Accept: Button default = Shenanigans primary, secondary, ghost; focus ring token on `:focus-visible`. Verify: client component test renders Button variants; layer order deliberate (components before site overrides). (done 2026-10-31)
- [x] **M1-4** Theme: inline `<head>` script in `app.html` sets `data-theme` from localStorage or `prefers-color-scheme` before paint; ThemeToggle component; override persists. CSP-safe (nonce or hash, see M3-7). Covers: FR-7, UR-3. Design: SiteNav theme toggle (all boards). Deps: M1-1. Accept: no flash. Verify: Playwright with `colorScheme: dark`, assert `data-theme` on first paint and persistence after toggle + reload. (done 2026-10-31)
- [x] **M1-5** Base layout: Section, Container (narrow 720 / default 1080 / wide 1280), Frame, SectionTitle, Eyebrow, Tag, Button wrappers per DESIGN.md. Covers: MR-1, UR-1, UR-4. Design: Shared pieces. Deps: M1-3. Accept: components match tokens in both themes. Verify: client tests plus visual check in section 9. (done 2026-10-31)
- [x] **M1-6** Icons: add `@lucide/svelte` (or the shadcn default) for generic line icons only. Covers: UR-1. Deps: M1-3. Accept: no emoji anywhere. Verify: grep. (done 2026-10-31)

### M2 Data layer

- [x] **M2-1** Decide and set up the local backend. Recommendation: Supabase CLI local stack (needs Docker, gives Auth, Storage, Postgres, Studio and RLS parity); hosted dev project as fallback. Add `supabase/config.toml` (`bunx supabase init`), enable only GitHub provider, document ports, point `DATABASE_URL` at the local Postgres (54322). Keep `compose.yaml` only if Supabase CLI is unavailable. Deps: M0-1. Blocked if Docker is not running: record in Blockers and develop against compose.yaml Postgres meanwhile (schema, queries and tests do not need Auth). Verify: `bunx supabase status` or `docker compose up` plus `bun run db:migrate`. (done 2026-10-31)
- [x] **M2-2** Drizzle schema: `posts`, `projects`, `tags`, `post_tags`, `project_tags`, `rate_limits` exactly per SOFTWARE.md 3.2; enums for status; unique slugs; composite unique pairs; `project_id` FK on posts with `ON DELETE SET NULL`; link tables `ON DELETE CASCADE`; check constraints (cover_alt required when cover_image set; at most one featured via partial unique index). Covers: MR-2, FR-4 data, FR-16, FR-19, FR-33, SR-14 store. Deps: M0-2, M2-1. Accept: `db:generate` makes a versioned migration. Verify: apply to empty DB; schema unit test inserts violating rows and expects errors. (done 2026-10-31)
- [x] **M2-3** RLS migration (custom SQL in the Drizzle migration folder; verify Drizzle RLS support when implementing): enable RLS on every table; public select only on published rows (and tags/links via published content); writes only for the admin user id; `rate_limits` RLS on with no policies. Covers: SR-4, SR-14. Deps: M2-2. Accept: anon role sees only published rows; anon cannot read `rate_limits`. Verify: server tests connecting as `anon` role (SET ROLE) assert row visibility and denial. (done 2026-10-31)
- [x] **M2-4** Seed data (clearly marked fixtures, dev only): 3 projects (one featured), 4 posts (one draft), tags, one test post with script/event-handler payloads and all five alert types and code blocks. `bun run db:seed`. Covers: FR-4, SR-8 test data. Deps: M2-2. Accept: seed is idempotent and refuses to run when `NODE_ENV=production`. Verify: run twice. (done 2026-10-31)
- [x] **M2-5** Data access module `src/lib/server/content/`: typed queries for public (published only) and admin (all), prev/next, tag counts, related project. Zod-validated inputs. Covers: FR-2, FR-3, FR-4, FR-17, FR-27, FR-28, FR-29. Deps: M2-2. Accept: public queries never return drafts. Verify: server tests against seeded DB (draft visibility, ordering, prev/next by `sort_order` and `published_at`, counts only from published). (done 2026-10-31)

### M3 Auth and security

- [x] **M3-1** Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`), server client factory with cookie handling (httpOnly, Secure, SameSite=Lax), `hooks.server.ts` with `safeGetUser()` via `getUser()`. Verify with SvelteKit 3 and current @supabase/ssr docs. Covers: SR-1, SR-6. Deps: M0-4, M2-1. Accept: locals carry validated user or null. Verify: unit test with a mocked client; manual sign-in once credentials exist. (done 2026-10-31)
- [x] **M3-2** Allowlist: compare numeric GitHub id (`ADMIN_GITHUB_ID` env, from `user.user_metadata.provider_id`) ; mismatch signs out immediately. Covers: FR-10, SR-3. Deps: M3-1. Accept: username/email never used. Verify: unit tests with matching, non-matching, missing id, and username-spoof metadata. (done 2026-10-31)
- [x] **M3-3** `requireAdmin(event)` helper used in every `/admin` load, form action and endpoint (not only the layout); unauthenticated actions return 401/redirect. Covers: SR-2. Deps: M3-2. Accept: a route-inventory test fails if an admin `+page.server.ts`/`+server.ts` lacks the guard. Verify: that test plus direct POST without session returns failure. (done 2026-10-31)
- [x] **M3-4** Login screen and flow: `/admin` login page with GitHub-only button, actions that start OAuth, `/auth/callback` code exchange, sign out. States: default, signing-in, denied, error, rate-limited. No link from public pages. Covers: FR-8, FR-9, FR-14, SR-12. Design: Login boards (all 10). Deps: M1-5, M3-2. Accept: matches designs in both themes; denied copy per G8 (see D6). Verify: Playwright with stubbed auth; manual real sign-in (human task H2-H4). (done 2026-10-31)
- [x] **M3-5** Rate limiter: atomic upsert on `rate_limits` via Drizzle (`INSERT ... ON CONFLICT DO UPDATE`), HMAC-hashed IP (`RATE_LIMIT_SECRET`), limits per SR-14 table, opportunistic cleanup, fail-open with logging, runs in hooks before any auth call, `getClientAddress()` only. Covers: SR-14. Deps: M2-2, M3-1. Accept: 429 with `Retry-After` and plain message. Verify: server tests: 11th request returns 429; 3rd allowlist rejection blocks for 1h; 50 concurrent requests count exactly 50; spoofed `X-Forwarded-For` does not change the key; DB failure allows the request and logs; table unreadable via anon role. (done 2026-10-31)
- [x] **M3-6** Public 429 page and `+error.svelte` copy switching on status (404, 429, other). Covers: FR-30. Design: PublicError 429 boards, Login-rate-limited. Deps: M3-5, M1-5. Verify: Playwright asserts status and `Retry-After`. (done 2026-10-31)
- [x] **M3-7** Security headers and CSP in `kit.csp` (SvelteKit config in `vite.config.ts` sveltekit options; verify when implementing): strict script/style, nonce or hash for the theme script, `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`; keep form origin check on; `/admin` `noindex` header plus robots disallow. Covers: SR-10, SR-11. Deps: M1-4. Accept: no CSP violations in console on any page. Verify: Playwright console listener over all routes; header assertions. (done 2026-10-31)
- [x] **M3-8** Cache headers: public `s-maxage=60` with short `stale-while-revalidate`; admin `no-store`. Covers: PR-1, PR-2. Deps: M3-3. Verify: header tests. (done 2026-10-31)

### M4 Markdown

- [x] **M4-1** `renderMarkdown()` one shared function in `src/lib/markdown/`: remark-parse, remark-gfm, remark-rehype (raw HTML off), rehype-sanitize (first), rehype-github-alerts, rehype-highlight via lowlight with class output, then fixed-markup code header step, rehype-stringify. Processor created once per instance. Covers: FR-5, SR-8, SR-13, PR-5. Deps: M0-2. Accept: used by both public pages and admin preview. Verify: unit tests: script tag, `onerror`, `javascript:` URLs, raw HTML, SVG, data URIs all inert; alerts become callouts; heading ids. (done 2026-10-31)
- [x] **M4-2** Code block header and Copy: language label only if it matches `^[A-Za-z0-9+#-]{1,20}$`; fixed markup; tiny client script attaches one delegated listener (no inline handlers); "Copied" for ~2s; `aria-live` announcement; button hidden without JS; copies code text only. Covers: SR-15, UR-9. Design: Post boards (code blocks). Deps: M4-1. Verify: unit tests for label rule (`<img onerror>` fence label dropped); browser test of copy text equality and revert after 2s. (done 2026-10-31)
- [x] **M4-3** Token-based CSS for Prose, alerts (five types by label and icon, slight tint at most) and `hljs-*` classes (monochrome: shade, weight, italic). Covers: UR-6, UR-7, UR-8. Deps: M4-1, M1-1. Accept: contrast met in both themes. Verify: contrast calculation script over comment/muted/alert pairs; visual check. (done 2026-10-31)
- [x] **M4-4** Read time helper computed from body (not stored). Covers: 3.2 read time. Deps: M4-1. Verify: unit test. (done 2026-10-31)

### M5 Public site

- [x] **M5-1** Header (NavBar) with desktop links, theme toggle, Get in touch mailto, and phone menu (640px and below): `aria-expanded`, `aria-controls`, closes on Escape and link tap, focus returns to button, 48px rows, current page highlighted. Footer single row, sticks to bottom on short pages, year auto. Covers: FR-6, FR-25, FR-26, UR-2, UR-4. Design: SiteNav, SiteFooter, MenuOpenMobile. Deps: M1-5, M1-4. Verify: Playwright at 375px for menu behaviours; footer position at short page. (done 2026-10-31)
- [x] **M5-2** Site config module (name, email, social URLs, domain) and About me content in code `src/lib/content/about.ts` with placeholder content clearly marked TODO. Covers: FR-23 data. Deps: M0-2. Verify: type check. (done 2026-10-31)
- [x] **M5-3** Home: hero (photo placeholder grayscale 4:5, name, caption, no status line, no Get in touch), About me (catchphrase, bio, quick facts, skills chips, timeline, résumé button hidden until file exists via build-time check), Featured, Latest posts, contact box. Section order exact. Covers: FR-1, FR-6, FR-23, FR-24, PR-3. Design: Main, HomeDark, HomeMobile, LaunchHome, HomeEmpty, PublicHome*. Deps: M5-1, M5-2, M2-5, M4-4. Verify: Playwright order and absence assertions; visual. (done 2026-10-31)
- [x] **M5-4** Projects index with tag filter chips (URL `?tag=`), counts from published only, hidden when under 2 projects, one-project layout, empty state. Covers: FR-2, FR-29. Design: Projects*, PublicProjects*, ProjectsEmpty, ProjectsMobile. Deps: M5-1, M2-5. Verify: Playwright with seeded and emptied DB states. (done 2026-10-31)
- [x] **M5-5** Project page: back link, header, facts card (rows without value omitted), 16:10 cover with muted fallback, markdown body, prev/next in showcase order, contact box. Covers: FR-2, FR-27, FR-5. Design: ProjectDetail, ProjectDetailDark, ProjectDetailMobile. Deps: M4-1..3, M5-4. Verify: Playwright; unpublished slug returns 404. (done 2026-10-31)
- [x] **M5-6** Blog index: row list, tag chips with counts, pagination (D4), empty state. Covers: FR-3, FR-29. Design: Blog*, PublicBlog*, BlogEmpty, BlogMobile. Deps: M5-1, M2-5. Verify: Playwright. (done 2026-10-31)
- [x] **M5-7** Post page: header, 680px prose, "The project this post is about" only for published linked project, prev/next by `published_at`. Covers: FR-3, FR-5, FR-28. Design: Post, PostDark, PostMobile. Deps: M4-1..3, M5-6. Verify: Playwright (linked, unlinked, draft-linked project). (done 2026-10-31)
- [x] **M5-8** 404 and 500 pages (+error.svelte, `hooks.server` `handleError` logs server-side, no details to client), real 404 status for unknown, unpublished and deleted. Covers: FR-30, FR-4. Design: NotFound*, Error*, PublicError*. Deps: M3-6. Verify: Playwright asserts status 404 on each case; forced error shows no stack or message. (done 2026-10-31)
- [x] **M5-9** Metadata: per-page title, description, canonical, Open Graph, Twitter, preview image; favicon; `sitemap.xml` of published pages only; `robots.txt` with sitemap and `/admin` disallow. Covers: FR-31, SR-11. Deps: M5-3..7. Verify: Playwright/unit per page type; sitemap excludes drafts and admin. (done 2026-10-31)
- [x] **M5-10** Preview images: static site preview PNG (1200x630, design OGHome) and per-post generated image (design OGPost) at `/og/[slug].png`, rendering per D8, titles drawn as text, cached, refreshes within 60s. Covers: FR-32. Design: OGHome, OGPost. Deps: M5-9. Verify: request returns image/png 1200x630; title with `<script>` renders as plain text (visual check). (done 2026-10-31)
- [x] **M5-11** Image handling: enhanced-img for static assets, lazy loading except hero, width/height set, Supabase Storage images via public URL helper from stored path. Covers: PR-3. Deps: M5-3. Verify: check `loading` attributes in Playwright. (done 2026-10-31)

### M6 Admin

- [x] **M6-1** Admin shell: sidebar (232px) with Posts, Projects, Tags and counts, sign out; mobile top bar with section switcher; noindex. Covers: FR-14, SR-2, SR-11, UR-4. Design: AdminPosts*, mobile boards. Deps: M3-4, M1-5. Verify: Playwright auth-stubbed; unauthenticated redirect. (done 2026-10-31)
- [x] **M6-2** Posts list: tabs (All/Published/Draft), table, status badge, row menu (Edit, Publish/Unpublish, Delete), loading and empty states, delete confirm dialog. Covers: FR-11, FR-20. Design: AdminPosts* (list, loading, empty, delete), AdminPostsMobile. Deps: M6-1, M2-5. Verify: Playwright. (done 2026-10-31)
- [x] **M6-3** Post editor form: title, slug (generated, locked after first publish server-side), excerpt, status, tags picker (create inline), cover, alt, project selector (clearable), Zod validation, actions create/update/publish/unpublish/delete. Covers: FR-11, FR-18, FR-19, FR-33, SR-7. Design: PostEditor boards. Deps: M6-2. Verify: server tests: slug change after publish rejected even if forged; alt required with cover. (done 2026-10-31)
- [x] **M6-4** Markdown editor with toolbar and live preview using `renderMarkdown()` via the same function (client-safe render endpoint or isomorphic import), split panes, stacked on phone. Covers: FR-12, SR-13, SR-15. Design: PostEditor, PostEditorMobile. Deps: M6-3, M4-1. Verify: test that preview HTML equals public HTML for the same body; Copy button works in preview. (done 2026-10-31)
- [x] **M6-5** Save states: indicator (clean/unsaved/saving/saved), toasts, failed-save banner with Retry keeping content, expired-session dialog with Copy markdown and Continue with GitHub. Covers: FR-21, FR-22. Design: PostEditor-{unsaved,saving,saved,failed,expired,leave}. Deps: M6-4. Verify: Playwright: offline save and 401 save keep typed content. (done 2026-10-31)
- [x] **M6-6** Unsaved-changes guard: `beforeunload`, `beforeNavigate` for in-app links and back, Leave dialog (Keep editing default). Covers: FR-21, FR-20. Design: PostEditor-leave. Deps: M6-5. Verify: Playwright for refresh, tab close, back and in-dashboard link. (done 2026-10-31)
- [x] **M6-7** Image upload to Supabase Storage (bucket public read, admin write): type/size checks client and server, random object names, path stored not URL, uploader states, Image toolbar inserts `![alt](url)`. Covers: FR-13, SR-9. Design: SharedUpload*. Deps: M6-3, H1. Verify: server tests for type/size rejection (SVG rejected); manual upload once the Supabase project exists. (done 2026-10-31)
- [x] **M6-8** Projects list: order controls (move up/down), featured switch with swap toast and Undo, tabs, delete. Covers: FR-15, FR-16, FR-17, FR-20. Design: AdminProjects*, AdminProjectsMobile. Deps: M6-2. Verify: server tests: featuring second un-features first atomically (transaction), concurrent toggles leave at most one; reorder changes showcase order. (done 2026-10-31)
- [x] **M6-9** Project editor (summary, body, year, role, team, live/repo URLs, featured, tags, cover+alt) with all save states. Covers: FR-15, FR-16, FR-18, FR-19, FR-21, FR-22. Design: ProjectEditor* boards. Deps: M6-8, M6-5. Verify: Playwright mirrors post editor tests. (done 2026-10-31)
- [x] **M6-10** Tags admin: create, inline rename with slug preview, delete with counts dialog. Covers: FR-18, FR-20. Design: AdminTags*. Deps: M6-1. Verify: server tests: duplicate name case-insensitive rejected; delete removes links only. (done 2026-10-31)
- [x] **M6-11** Delete behaviours and storage cleanup (D3): deleting content removes its link rows; orphaned images deleted per D3 decision. Covers: 3.2, SR-9. Deps: M6-7. Verify: server test. (done 2026-10-31)

### M7 Freshness and caching

- [x] **M7-1** On-demand revalidation after create/edit/publish/unpublish/delete for affected pages (post/project page, indexes, Home, tag counts, sitemap, og image) using Vercel ISR with bypass token (D9; verify adapter-vercel `isr` options when implementing). Covers: PR-6. Deps: M5, M6. Accept: pages update within 60s. Verify: Playwright flow against preview; in local dev the 60s cache window fallback is tested via headers. (done 2026-10-31)
- [x] **M7-2** Fallback note "Saved. The public page can take up to a minute to update." shown in the saved toast. Covers: PR-6. Deps: M6-5. (done 2026-10-31)
- [x] **M7-3** Reconsider prerender/ISR (record outcome only). Covers: PR-4. Deps: M7-1. (done 2026-10-31)

### M8 Hardening and QA

- [x] **M8-1** Test suites listed in section 7 completed; coverage gaps closed. Covers: all SR. Verify: full `bun run test:unit -- --run` and e2e. (done 2026-10-31)
- [x] **M8-2** Accessibility: add `@axe-core/playwright` checks on every public page and admin screen in both themes; keyboard pass. Covers: UR-2, UR-8, UR-10. Verify: zero serious/critical violations. (done 2026-10-31)
- [x] **M8-3** Visual checks of every page in light, dark and 390px against the designs (section 9). Covers: UR-4, UR-5, UR-10. Verify: Playwright screenshots saved to `test-results/visual/` and compared manually; note diffs in log.
- [x] **M8-4** Journeys A, B, C end-to-end specs. Covers: JOURNEY A-C. Verify: pass.
- [x] **M8-5** Console and CSP audit, secrets audit (`grep` build output for env secret names). Covers: SR-5, SR-10. Verify: scripted check in e2e. (done 2026-10-31)
- [x] **M8-6** Run SOFTWARE.md section 4 verification checklist and tick it in section 9 below.

### M9 Deployment

- [x] **M9-1** Vercel config: env var list documented, `ORIGIN`, trusted proxy/IP handling so `getClientAddress()` cannot be spoofed (verify when implementing), build on Vercel. Covers: SR-14. Deps: H5.
- [ ] **M9-2** BLOCKED: Production Supabase: run migrations, RLS check, GitHub provider only, redirect URLs, storage bucket policy. Deps: H1-H4.
- [ ] **M9-3** BLOCKED: Domain and launch checklist (section 9). Deps: H6.

### M10 Motion (public site)

Spec: DESIGN.md "Motion (public site)", PRODUCT.md section 6, SOFTWARE.md UR-11. Decisions (confirmed, see D22): all five moments (hover and focus, load, scroll reveal, page transitions, theme cross-fade), energetic, public site only, admin keeps small transitions, no animation library (CSS, Svelte built-ins, browser view transitions). If something needs more than that, Motion (motion.dev) is the fallback; record it first as a spec change request.

- [ ] **M10-1** Motion foundation. Goal: tokens, reduced-motion switch, safe-by-default reveal mechanism. Touches: `src/lib/styles/tokens.css`, `src/routes/layout.css`, `src/app.html`, new `src/lib/motion/` helpers. Covers: UR-11. Design: Motion token table. Deps: M1-1. Accept: `--motion-*`, `--ease-out`, `--stagger`, `--rise-*` exist and are mapped in the Tailwind theme; `@media (prefers-reduced-motion: reduce)` removes all motion; entrances use `data-reveal` and only hide under `html.js` after the page is marked ready; a CSS keyframe reveals anything still hidden after 2.5s; a `reveal` Svelte action marks elements visible. Verify: unit/browser test of the action; Playwright with reduced motion and with JavaScript disabled shows all content at once.
- [ ] **M10-2** Hover and focus polish. Touches: Button, Tag, cards, links, theme toggle, arrows. Covers: UR-11, UR-2. Design: Motion, Hover and focus. Deps: M10-1. Accept: press 97% with spring release, arrow nudge 3px, card lift 4px, image zoom 4%, link underline grows, focus ring fades in; no layout shift; admin components unchanged. Verify: browser tests on computed transforms; keyboard focus screenshot; admin button has no press scale.
- [ ] **M10-3** Load entrances. Touches: Hero, hero photo, Home first screen. Covers: UR-11, PR-3. Design: Motion, On load. Deps: M10-1. Accept: headline lines rise and fade 80ms apart, then subtitle and buttons; photo scales 96% to 100% with no opacity change; header does not animate; the hero image is still eager and is not delayed. Verify: Playwright checks start and end state; LCP and CLS measured (CLS 0, LCP not later than before by more than 100ms).
- [ ] **M10-4** Scroll reveals. Touches: Section children on Home, Projects, Blog, case study and post pages. Covers: UR-11. Design: Motion, On scroll. Deps: M10-1. Accept: children rise 32px and fade over 600ms when 15% visible, staggered 70ms for groups, once only; above-the-fold content never waits; short pages and the footer are never hidden. Verify: Playwright scrolls and asserts reveal once; scrolling back does not replay; full-page screenshots show everything revealed.
- [ ] **M10-5** Page transitions. Touches: root layout (`onNavigate` with `document.startViewTransition`), `view-transition-name` on header and footer, transition CSS. Covers: UR-11. Design: Motion, Between pages. Deps: M10-1. Accept: header and footer stay, main cross-fades 300ms while rising 12px; no transition when unsupported or when reduced motion is on; back and forward work; focus and scroll position behave as before. Verify: Playwright navigation tests with and without `startViewTransition`; keyboard navigation still lands on the new page heading.
- [ ] **M10-6** Theme cross-fade. Touches: `src/lib/theme.svelte.ts`, theme CSS. Covers: UR-11, UR-3. Design: Motion, Theme switch. Deps: M10-1. Accept: the toggle cross-fades the whole page over 300ms using a view transition; falls back to instant; the first paint still has no flash and the choice still persists. Verify: existing theme e2e still passes; new test checks the transition runs and the final theme is correct.
- [ ] **M10-7** Motion QA and docs. Covers: UR-11, SR-10, UR-10. Deps: M10-2 to M10-6. Accept: no CSP violations or console errors; axe clean in both themes; reduced motion, JavaScript off and a failed hydration all show every section; admin screens have no entrance or page transition; phone widths checked; DESIGN.md matches what was built. Verify: Playwright suite for motion (reduced motion, no JS, CLS, CSP), axe, screenshots in light, dark and phone widths.

## 5. Human-only tasks

| ID | Needed by | What I need from you | Until then |
|---|---|---|---|
| H1 Create Supabase project (hosted) | M6-7 real upload, M9-2 | Project URL, anon key, service role key, DB connection string (pooled, port 6543) into `.env` locally and Vercel | Use Supabase local stack (needs Docker running) or compose Postgres for data work; Auth and Storage flows are tested with stubs |
| H2 Create GitHub OAuth app | M3-4 real login | Client ID and secret into Supabase Auth GitHub provider; callback `https://<project>.supabase.co/auth/v1/callback` (and local `http://127.0.0.1:54321/auth/v1/callback`) | Stubbed auth in tests |
| H3 Find numeric GitHub ID | M3-2 real login | `gh api user --jq .id` or github.com/users/NAME API | Tests use a fixture id |
| H4 Add ID to env | M3 | `ADMIN_GITHUB_ID` | `.env.example` placeholder |
| H5 Create Vercel project, set env vars | M9-1 | Project linked to repo; vars from `.env.example` | Local build only |
| H6 Register `shenanigans.is-a.dev` | M9-3 | PR to is-a.dev register pointing to Vercel | Use `*.vercel.app` URL |
| H7 Photo | M5-3 | Grayscale-ready portrait file in `src/lib/assets/` (name `portrait.jpg`) | Neutral placeholder tile |
| H8 Résumé PDF | M5-3 | File at `static/resume.pdf` | Button hidden |
| H9 Real About me, projects, posts | Launch | Text for `about.ts`; content via the dashboard | Fixtures marked `[PLACEHOLDER]` |

Never invent credentials. `.env.example` holds names only.

## 6. Test strategy

Vitest `server` project for logic and DB tests (database from M2-1); `client` project for component tests; Playwright for flows. Tests that need a database use a separate `shenanigans_test` database and run migrations first.

Required coverage (task in brackets): allowlist and authorization on every admin route and action [M3-2, M3-3]; RLS behaviour [M2-3]; sanitizer payloads inert [M4-1]; rate-limit counting under concurrency and XFF spoofing [M3-5]; draft visibility [M2-5]; featured swap and ordering [M6-8]; slug locking [M6-3]; freshness within 60s [M7-1]; unsaved warning [M6-6]; failed save keeps content [M6-5]; 404 status [M5-8]; sitemap contents [M5-9]; metadata per page type [M5-9]; Copy button [M4-2]; keyboard and phone menu [M5-1]; automated a11y [M8-2]; journeys A, B, C [M8-4]; visual checks [M8-3].

## 7. Traceability: requirements to tasks

| ID | Task(s) |
|---|---|
| FR-1 | M5-3 |
| FR-2 | M5-4, M5-5 |
| FR-3 | M5-6, M5-7 |
| FR-4 | M2-5, M5-8 |
| FR-5 | M4-1, M5-5, M5-7 |
| FR-6 | M5-1, M5-3 |
| FR-7 | M1-4 |
| FR-8 | M3-4 |
| FR-9 | M3-4 |
| FR-10 | M3-2 |
| FR-11 | M6-2, M6-3 |
| FR-12 | M6-4 |
| FR-13 | M6-7 |
| FR-14 | M3-4, M6-1 |
| FR-15 | M6-8, M6-9 |
| FR-16 | M2-2, M6-8, M6-9 |
| FR-17 | M2-5, M6-8 |
| FR-18 | M6-3, M6-9, M6-10 |
| FR-19 | M2-2, M6-3 |
| FR-20 | M6-2, M6-8, M6-10 |
| FR-21 | M6-5, M6-6, M6-9 |
| FR-22 | M6-5, M6-9 |
| FR-23 | M5-2, M5-3 |
| FR-24 | M5-3 |
| FR-25 | M5-1 |
| FR-26 | M5-1 |
| FR-27 | M5-5 |
| FR-28 | M5-7 |
| FR-29 | M5-3, M5-4, M5-6 |
| FR-30 | M3-6, M5-8 |
| FR-31 | M5-9 |
| FR-32 | M5-10 |
| FR-33 | M2-2, M6-3 |
| SR-1 | M3-1 |
| SR-2 | M3-3 |
| SR-3 | M3-2 |
| SR-4 | M2-3 |
| SR-5 | M0-4, M8-5 |
| SR-6 | M3-1 |
| SR-7 | M0-4, M6-3 |
| SR-8 | M4-1 |
| SR-9 | M6-7, M6-11 |
| SR-10 | M3-7 |
| SR-11 | M3-7, M5-9, M6-1 |
| SR-12 | M3-4, M9-2 |
| SR-13 | M4-1, M6-4 |
| SR-14 | M3-5, M9-1 |
| SR-15 | M4-2, M6-4 |
| PR-1 | M3-8 |
| PR-2 | M3-8 |
| PR-3 | M1-2, M5-11 |
| PR-4 | M7-3 |
| PR-5 | M4-1 |
| PR-6 | M7-1, M7-2 |
| UR-1 | M1-1, M1-3, M1-5 |
| UR-2 | M5-1, M8-2 |
| UR-3 | M1-4 |
| UR-4 | M1-5, M5-1, M6-1 |
| UR-5 | M1-1, M8-3 |
| UR-6 | M4-3 |
| UR-7 | M4-3 |
| UR-8 | M4-3, M8-2 |
| UR-9 | M4-2 |
| UR-10 | M8-2, M8-3 |
| UR-11 | M10-1, M10-2, M10-3, M10-4, M10-5, M10-6, M10-7 |
| MR-1 | M1-1, M1-3 |
| MR-2 | M2-2 |
| MR-3 | M1-1, M1-3 |

## 8. Traceability: design screens to tasks

| Design screens (board names) | Task |
|---|---|
| Public Home, Home dark, Home phone, Menu open (phone) | M5-1, M5-3 |
| Home launch (1 project, 1 post), Home empty, PublicHome single/empty (light, dark) | M5-3 |
| Projects, Projects dark, Projects phone, ProjectsEmpty, PublicProjects single/empty | M5-4 |
| Project case study (light, dark, phone) | M5-5 |
| Blog, Blog dark, Blog phone, BlogEmpty, PublicBlog single/empty | M5-6 |
| Post (light, dark, phone) | M5-7 |
| 404 (light, dark), Error (light, dark), PublicError 404/error/429 | M5-8, M3-6 |
| Link preview site, Link preview post | M5-10 |
| SiteNav, SiteFooter | M5-1 |
| Login: default, signing in, denied, rate limited, error (light, dark) | M3-4 |
| Posts list: list with row menu, loading, empty (light, dark) | M6-2 |
| Delete post dialog | M6-2 |
| Post editor: clean, unsaved with tag picker, saving, saved (slug locked), failed, expired (light, dark) | M6-3, M6-4, M6-5 |
| Leave with unsaved changes dialog | M6-6 |
| Projects list: list, featured switched, empty | M6-8 |
| Project editor: all states (light, dark) | M6-9 |
| Tags: list with rename, empty, delete dialog | M6-10 |
| Mobile admin: posts list, projects list, post editor | M6-1, M6-2, M6-8, M6-4 |
| Shared: image upload, toasts, loading and empty | M6-7, M6-5, M1-5 |

## 9. Traceability: journey gaps

| Gap | Handling |
|---|---|
| G1 RSS | Deferred, not planned (D10) |
| G2 draft protection | M6-5, M6-6 |
| G3 freshness | M7-1, M7-2 |
| G4 empty/404/500 | M5-3, M5-4, M5-6, M5-8 |
| G5 metadata | M5-9, M5-10 |
| G6 About me | M5-3; validate in the recruiter walk-through (human) |
| G7 slug typo | Accepted: slug locked (FR-19); deferred |
| G8 denial and 429 copy | M3-4, M3-6; copy from the designs (D6) |
| G9 résumé | H8; button hidden until file exists (M5-3) |
| G10 About in code | Accepted (M5-2) |
| G11 preview rendering | D8, M5-10 |
| G12 admin design | Done; built in M3-4, M6-* |

## 10. Definition of done

Per milestone: all listed requirement IDs verified, check, lint, unit tests and build pass, no console errors or CSP violations, both themes and phone widths match designs, no secrets in client code.
Project: every checkbox ticked or blocked with a recorded reason; e2e passes; SOFTWARE.md section 4 checklist ticked (below); deployment checklist done.

SOFTWARE.md section 4 checklist (tick as verified, with task):
- [x] Auth (M3-2/3) - [x] Visibility (M2-5) - [x] Projects admin (M6-8/3) - [x] Editor safety (M6-5/6) - [x] Freshness (M7-1, fallback path verified; ISR path blocked) - [x] Rendering (M4-1) - [x] Themes (M8-3) - [x] Home and navigation (M5-1/3) - [x] Pages and states (M5-*) - [x] Metadata (M5-9/10) - [x] Code blocks (M4-2) - [x] Markdown styling (M4-3) - [x] Rate limiting (M3-5)

Deployment checklist: [ ] env vars set on Vercel [ ] migrations applied to prod [ ] RLS verified on prod [ ] only GitHub provider enabled [ ] Supabase redirect URLs correct [ ] allowlist id set [ ] CSP clean in prod [ ] sitemap and robots live [ ] preview image tested in a chat paste [ ] domain live [ ] Supabase free-tier pause risk checked (below).

## Blockers

(agents append `- Mx-y: what is needed`)

- M3-4 (partial): the real GitHub sign-in round trip cannot be verified until H1-H4 are done (GitHub OAuth app, numeric GitHub id, Supabase GitHub provider credentials). Everything around it is tested with the local stack: login states, denied/error notices, redirects, 401s, rate limits, callback error path. Manual check needed: sign in with your account, then with a second account to see the denied state and the signed-out result.

- M7-1 (partial): on-demand revalidation on Vercel (D9) is implemented as `revalidatePublic` (HEAD with `x-prerender-revalidate` when `VERCEL_ISR_BYPASS_TOKEN` and `ORIGIN` are set) but the ISR route config (`export const config = { isr: ... }` with the bypass token on the public routes) is NOT enabled because it cannot be verified without a Vercel deployment. The tested fallback (s-maxage=45 + stale-while-revalidate=10, so at most 55s stale, plus the dashboard note) already meets PR-6. Needs: after H5, enable ISR on the public routes per the adapter-vercel docs, set the token, and re-run the freshness e2e against the preview deployment.

- M9-2 BLOCKED: needs H1 (hosted Supabase project and keys), H2 (GitHub OAuth app), H3/H4 (numeric GitHub id in env). Steps are in README "Deploying".
- M9-3 BLOCKED: needs H5 (Vercel project and env vars) and H6 (is-a.dev registration). Then tick the deployment checklist in section 10.
- H7: portrait photo not provided (hero shows a muted tile; the OG images use a tile too). Needs `src/lib/assets/portrait.jpg`; the grayscale OG photo slot also needs a pre-converted grayscale copy (not automated).
- H8: résumé not provided (button hidden until `static/resume.pdf` exists).
- H9: real About me text (`src/lib/content/about.ts`), real GitHub and LinkedIn URLs (`src/lib/site.ts`, currently github.com and linkedin.com), and real projects and posts. The sample content in the dev database is marked `[SAMPLE]` and must not be seeded in production (the seed script refuses `NODE_ENV=production`).
- Verify on Vercel after deploy: native `@resvg/resvg-js` for OG images (D8), spoof-proof `getClientAddress()` (SR-14), adapter-vercel build.

## Decisions and discrepancies (recommended defaults, marked for your approval)

- D1 DESIGN.md is stale in places (Astro/islands, reactions, comments, newsletter, About page, brand block footer). PRODUCT.md and SOFTWARE.md win; ignore those parts. Public design wins on visuals.
- D2 Stale "not designed yet" wording is superseded by the admin design. Built from the design.
- D3 Upload rules (APPROVAL): JPEG, PNG, WebP, GIF, AVIF only; no SVG; 5 MB max; random object names; delete storage objects when the owning cover is replaced or content is deleted (inline markdown images are not tracked, so no auto-delete for them; note it).
- D4 Blog pagination (APPROVAL): 10 posts per page via `?page=`; hidden when one page.
- D5 Tag filters (APPROVAL): URL-based `?tag=slug`, server-rendered, shareable.
- D6 Denied and 429 copy: take the exact words from the admin design boards (Login-denied, Login-rate-limited, PublicError-429). If unreadable, plain neutral text without reasons.
- D7 Accessibility target (APPROVAL): WCAG 2.1 AA as asked; DESIGN.md says 2.2 AA and its palette meets it, so build to 2.2 AA where free.
- D8 Post preview images (APPROVAL): render with `satori` + `@resvg/resvg-js` (or `@vercel/og`) in a server route, cached via `s-maxage` plus revalidation; verify Vercel runtime support and bundle size when implementing. Project pages use the site image.
- D9 PR-6 on Vercel (APPROVAL): adapter-vercel ISR with `bypassToken` and revalidation by request on save; if unsupported in the SvelteKit 3 adapter, use the 60s cache window plus the dashboard note (fallback in PR-6). Verify when implementing.
- D10 No RSS. Not built.
- D11 Backups (APPROVAL): rely on Supabase daily backups if on a paid plan; on free, run `pg_dump` manually before launch and monthly. Not automated by this plan.
- D12 Local dev (APPROVAL): Supabase CLI local stack recommended over a hosted dev project (offline, resettable, RLS parity); requires Docker Desktop running.
- D13 Supabase free-tier pausing risk: free projects pause after about a week of inactivity. Before launch check plan, set a keep-alive (scheduled request) or upgrade, and confirm the project is active.
- D14 Admin mutations use SvelteKit form actions with progressive enhancement; the live preview calls a POST endpoint guarded by `requireAdmin`.
- D15 Package `#lib` alias is used for imports in app code.
- D16 Local builds use `@sveltejs/adapter-node` (adapter-vercel needs symlink rights and fails on Windows without developer mode); `adapter-vercel` is used when `VERCEL` is set. `.env` holds placeholder values so env validation passes locally; real values come from H1-H4.
- D17 RLS write policy uses `public.is_admin()` (SECURITY DEFINER) which matches the caller's GitHub identity in `auth.identities` against the `admin_allowlist` table (filled by `bun run db:allow-admin` from `ADMIN_GITHUB_ID`). `user_metadata` is user-editable so it is not used. Tags are readable by the public only when used by published content.
- D18 The 30 per minute limit for unauthenticated /admin/* requests is applied to requests that carry no Supabase session cookie, because the limiter runs before any auth call (SR-14). Requests with a cookie are validated by auth and refused by requireAdmin.
- D19 Home empty state: the admin design handoff says "hero with one Get in touch button and a Nothing published yet frame", but PRODUCT.md 4.4 and FR-1 say the hero never has a Get in touch button and FR-29 specifies per-section empty states. Built per FR-1/FR-29 (HomeEmpty board): featured and latest-posts sections each show their own empty card. Launch state hides "All projects"/"All posts" under two items.
- D21 PR-4 outcome (M7-3): public pages stay server-rendered with a 45s shared cache. Prerendering or ISR is reconsidered only if real traffic shows the database or markdown rendering is a bottleneck.
- D22 Motion (CONFIRMED by the owner, 2026-10-31): all five moments (hover and focus, load, scroll reveal, page transitions, theme cross-fade), energetic, public site only, admin keeps small transitions, no animation library. Limits: durations 150/300/600ms; entrances rise 12 to 32px; stagger 70ms; spring overshoot at most 6% and only on small controls (buttons, tags, theme toggle), never on content; no parallax, spin, looping or pointer-following motion; the hero photo scales but does not fade so the largest paint is never delayed; a 2.5s CSS fallback reveals anything left hidden; reduced motion, no JavaScript and failed hydration show everything at once. These are final unless the owner changes them.
- D20 404 buttons: the admin handoff says Back home + Read the blog, PRODUCT.md 4.7 and FR-30 say Go home, View projects and Read the blog. Built the three-button version (PRODUCT.md wins on behaviour). The 500 page omits the design's "request reference" placeholder (no technical details, FR-30). `/auth/callback` is a page route (not an endpoint) so its 429 renders the styled error page.

## 11. Spec change requests

Spec change requests are recorded here. Implemented defaults stay in place until you decide.

- SCR-1 (FR-19, data model 3.2): `projects` has no `published_at`, so "slug locked after first publish" cannot be told from a project that is currently a draft after being published. Added `projects.first_published_at` (nullable timestamp, set on first publish, never cleared). Posts use the existing `published_at`. Migration `drizzle/0001_project_first_published.sql`. Please confirm or suggest another way.

## 12. Progress log

(entries below, newest last)
- 2026-10-31 M0-4: Zod env schemas in src/env.ts (SvelteKit 3 defineEnvVars), env.spec.ts; M0-3 scripts to bun, adapter-node locally (D16)
- 2026-10-31 M1-1: tokens.css + Tailwind @theme inline + type utilities; client test resolves light/dark; M1-2 fonts self-hosted via @fontsource (Space Grotesk Variable)
- 2026-10-31 M1-3: shadcn-svelte components added and mapped to tokens (destructive = ink, no red), Button per design; theme store + ThemeToggle + head script (M1-4, e2e passes); lucide icons (M1-6)
- 2026-10-31 M1-5: Section, Frame, Eyebrow, SectionTitle, Tag components + test
- 2026-10-31 M2-1: Supabase CLI local stack (supabase dev dep, config.toml: GitHub-only auth, email signup off, redirects for 5173/4173); compose.yaml removed; scripts db:start/db:stop/db:seed; Docker Desktop started from LOCALAPPDATA path
- 2026-10-31 M2-2: schema.ts, drizzle/0000_init.sql (hand-added is_admin() + revokes), schema.spec.ts + rls.spec.ts (14 server tests pass against local Supabase); M2-3 RLS policies done in same migration
- 2026-10-31 M2-4: scripts/seed.ts (idempotent, refuses production, includes hostile + alerts fixtures), scripts/allow-admin.ts; DB tests now empty tables inside their rolled-back transaction
- 2026-10-31 M2-5: public content queries (drafts hidden, showcase order, prev/next, tag counts, linked project only if published) + 5 DB tests; M0-5 README written
- 2026-10-31 M3-1: createServerClient with forced httpOnly/SameSite=Lax/Secure cookies, resolveSession via getUser() (tests with fake client), hooks.server.ts authenticate handle; M3-2 allowlist reads numeric id from server-provided identities, ignores username/email/user_metadata (9 tests). Real sign-in unverified until H2-H4
- 2026-10-31 M3-3: requireAdmin (redirect for pages, 401 for actions/endpoints), (app) layout guard, signout endpoint, route-inventory test fails on unguarded admin server files
- 2026-10-31 M3-5: atomic upsert limiter (11 tests incl. 50 concurrent hits exact, third rejection blocks 1h, window reset, cleanup), HMAC-keyed IPs, fail-open, handle keyed on getClientAddress only (XFF spoof test), locals.rateLimit + guard; admin-anonymous limit applies to requests without sb- cookie because it runs before auth (D18). HTTP 429 e2e comes with M3-4/M3-6
- 2026-10-31 M3-4: login card (default/signing-in/denied/rate-limited/error), signin action, /auth/callback with allowlist + rejection counting, /admin/+error.svelte shows rate-limited card, e2e login suite (11 pass). Real GitHub round trip is a blocker (see Blockers)
- 2026-10-31 M3-7: kit csp (nonce mode, strict) in vite.config, headers handle (nosniff, frame, referrer, permissions, HSTS on https), admin no-store + X-Robots-Tag, robots.txt disallows /admin, theme script uses nonce; route announcer style attr allowed by exact hash; e2e: 7 security tests, no CSP violations. M3-8 cache headers (public s-maxage=60 swr=30; admin no-store) tested
- 2026-10-31 M4-1: unified pipeline (sanitize before alerts/highlight/code headers, raw HTML off, class-based hljs), processor built once; 40 tests: 14 hostile payloads inert, 5 alert types, label allow-pattern, unsafe language classes dropped; readTimeMinutes (M4-4)
- 2026-10-31 M4-2: copy-button.ts delegated listener (4 browser tests: exact text, Copied ~2s, status announcement, live-preview markup), .js class from head script, Toaster + copy install in root layout; M4-3 prose.css (tokens only, monochrome hljs, alerts, code header) + contrast.spec (18 pairs, both themes)
- 2026-10-31 M5-3: Home: Hero, About me (placeholder content in about.ts, résumé button hidden until static/resume.pdf), Featured, Latest posts, contact box, empty and launch states; (site) layout with SiteNav (phone menu a11y) + SiteFooter; e2e home (7) and nav (7) pass; also M5-1, M5-2
- 2026-10-31 M5-7: Projects index (URL tag filter, counts, hidden under 2, empty/one states), case study page, Blog index (URL filters, pagination 10), post page (project card only if published, prev/next); shared Prose wrapper is the only {@html}; Seo component; e2e pages (15) pass, 47 total
- 2026-10-31 M5-8: root +error.svelte -> ErrorPage (404/429/500 with nav+footer), handleError logs unknown errors and returns a generic message; callback converted to a page route so 429 renders styled page (M3-6); e2e errors (4): 404 status, unpublished = unknown, forced 500 shows no detail, 429 with Retry-After
- 2026-10-31 M5-9: Seo component (title, description, canonical, OG, Twitter, preview image) on all page types, sitemap.xml (published only), robots.txt with sitemap; e2e seo (10)
- 2026-10-31 M5-10: OG images via satori + @resvg/resvg-js at /og/site.png and /og/<slug>.png (tokens read from tokens.css, fonts from @fontsource, title as text, per-instance cache keyed on updated_at, s-maxage=60); 5 e2e tests; visually checked. Photo slot is a muted tile until H7. VERIFY ON VERCEL: native resvg binary. M5-11 Cover lazy/eager/16:10-16:9/placeholder tested
- 2026-10-31 M2-6: (helper entry) admin data layer: validation + slugify, posts/projects/tags CRUD, slug locking, featured swap (advisory lock, concurrent test), reorder, tag dedupe, 20 tests; SCR-1 first_published_at migration
- 2026-10-31 M6-2: admin shell (sidebar + phone top bar/tabs, counts, sign out), posts list (status tabs, table, badges, row menu, delete confirm, skeleton, empty), restyled AlertDialog, e2e auth harness (JWT + session row signed with local secret; GitHub-only config stays), 3 authz + 5 list e2e tests; M6-1
- 2026-10-31 M6-7: post editor (create/save/publish/unpublish/delete, slug follows title then locks, tag combobox with inline create, project selector, cover + required alt, live preview via shared render, indicator, failed-save banner + Retry, expired-session dialog, LeaveGuard with beforeNavigate/beforeunload); upload endpoint (byte-sniffed types, no SVG, 5MB, random names, lazy bucket create) + 11 unit tests; 16 e2e tests incl. offline, expired session, forged slug, SVG rejection
- 2026-10-31 M6-10: projects list (order up/down, featured switch with swap toast + Undo, status, delete), project editor (all fields, featured hint names the project that loses it, slug lock via first_published_at), tags admin (create, near-duplicate refusal, inline rename with slug preview, delete dialog with counts); 7 e2e tests; M6-8, M6-9
- 2026-10-31 M6-11: storage cleanup: covers removed on replace/delete (best effort, markdown-inline images not tracked); e2e proves old and deleted covers disappear
- 2026-10-31 M7-1: revalidatePublic (Vercel bypass-header path, unit tested) + tested fallback; cache tightened to s-maxage=45/swr=10 (max 55s stale); freshness e2e for post and project; ISR route config deferred as a blocker (needs Vercel). M7-2 note shown, M7-3 recorded as D21
- 2026-10-31 M8-2: axe (wcag2a/aa, 2.1, 2.2 AA) on 6 public pages, phone menu, 5 admin screens + editor, login, light and dark: zero serious/critical after fixes (dl structure, focusable code scroll regions); M8-1 test inventory checked against section 6
- 2026-10-31 M8-5: journeys A/B/C e2e (M8-4), secrets audit of client build + public HTML (M8-5), 52 light/dark/phone screenshots reviewed (M8-3: Home, post, admin editor match design structure; visual check is by eye), SOFTWARE sec.4 checklist ticked (M8-6), deploy docs + env example (M9-1, spoofing check to repeat on Vercel)
- 2026-10-31 FINAL: full run: check 0 errors, lint clean, 153 unit/client tests, 156 e2e tests, build ok. Remaining unchecked: M9-2, M9-3 (blocked, human tasks)
- 2026-10-31 post-build gaps: image insertion into markdown (uploader panel, required alt, inserts at cursor), phone sticky Save/Publish bar with editor-own top bar, toast offset; 11 new e2e tests
