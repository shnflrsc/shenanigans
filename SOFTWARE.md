# Shenanigans: Software Requirements Specification

Version 0.6 · 2026-11-01 · Structured after IEEE 29148. Product intent lives in PRODUCT.md.

## 1. Introduction

### 1.1 Purpose
This document specifies the technical requirements for the Shenanigans website: a public portfolio and blog plus a single-admin dashboard for managing posts and projects.

### 1.2 Definitions
- **Admin**: the one authorized user (the owner).
- **Public site**: Home, Projects and Blog pages, readable by anyone.
- **Allowlist**: the GitHub account ID permitted to use the admin area.

## 2. Overall description

### 2.1 Product perspective
A server-rendered SvelteKit application deployed on Vercel, backed by Supabase (Postgres, Auth and Storage). Drizzle ORM talks to Postgres directly from the server.

### 2.2 Technology stack
| Layer | Choice |
|---|---|
| Framework | SvelteKit |
| UI | shadcn-svelte components for the whole site (public and admin); Tailwind CSS with the Shenanigans design foundations (colors, fonts, radius, shadows, spacing, light and dark) set up as the theme and CSS variables |
| Validation | Zod |
| Database access | Drizzle ORM |
| Backend services | Supabase: Postgres, Auth (GitHub provider), Storage |
| Hosting | Vercel via the SvelteKit Vercel adapter |
| Preview images | A site preview image (static) and per-post preview images (1200×630) rendered from a template; `satori` and `@resvg/resvg-js` (FR-32) |
| Rate limiting | A `rate_limits` table in Supabase Postgres, accessed through Drizzle (no extra service) |
| Continuous checks | GitHub Actions: gitleaks, `bun audit`, dependency review, CodeQL, the project's lint, type check and security tests (SR-16); Dependabot for updates |
| Tests | Vitest 5 (server tests in Node, component tests in Chromium through `@vitest/browser-playwright` and `vitest-browser-svelte` 3) and Playwright for end-to-end |
| Markdown | unified pipeline: `remark-parse`, `remark-gfm`, `remark-rehype` (raw HTML disabled), `rehype-sanitize`, `rehype-github-alerts`, `rehype-highlight` (class-based, via lowlight), `rehype-stringify` |

### 2.3 Users
- Anonymous visitors: read-only access to published content.
- Admin: authenticated, full control over posts, projects and tags.

### 2.4 Constraints
- Single admin; no user registration flow.
- The site must remain fast under meaningful traffic despite being dynamic.
- Service credentials must never reach the browser.
- The checks in CI use no repository secrets, run with read-only repository permissions, and use only pinned third-party actions.

### 2.5 Assumptions
- The owner's GitHub account is the only identity ever allowed into `/admin`.

## 3. Specific requirements

### 3.1 Functional requirements

**Public site**
- FR-1: The site provides a Home page in this order: hero, About me (FR-23), the featured project (FR-24), the latest posts, and a contact box. The hero has the headline, the subtitle, the buttons "View projects" (primary) and "Read the blog" (secondary), and my photo with my full name and caption; it has no status line and no "Get in touch" button. Exact copy is in PRODUCT.md section 4.4.
- FR-2: The site provides a Projects page listing published projects and a detail page per project.
- FR-3: The site provides a Blog page listing published posts and a page per post.
- FR-4: Only published posts and published projects are visible publicly. Drafts are never served to anyone but the admin.
- FR-5: Posts and project case studies render markdown, including GitHub-style alerts, as styled callouts.
- FR-6: Contact is an email link, with no contact form. Contact appears as a "Get in touch" button in the header (it scrolls to the contact box on pages that have one, and goes to the box on Home otherwise), a contact box with id `contact` at the end of Home, project pages and blog posts (with Email, GitHub and LinkedIn), and the same three icon links in the footer.
- FR-7: The site supports light and dark themes. It follows the visitor's system setting by default, and a manual toggle in the header (also visible on phones) overrides it. The override persists across visits.
- FR-23: Home has an "About me" section right after the hero, with: the catchphrase as a large line; a short bio; a quick-facts card (studying, school, based in, graduating year, open to, languages); "Skills and tools" as tag chips grouped as Languages, Frontend, Backend & data, Tools and Learning now; an "Experience and highlights" timeline (year, title, one-line detail); and a "Download résumé" button. This content is part of the site's code, not the database or the dashboard. The résumé is a static file; until the file exists the button is hidden, so it never links to a missing file.
- FR-24: The Featured section on Home shows only the project flagged featured, with no grid of other projects and no section subtitle. If no project is featured, it shows the empty state in FR-29.
- FR-25: The header on desktop shows the brand "Shenanigans", links to Home, Projects and Blog, a theme toggle (icon button, no border) and a primary "Get in touch" button that scrolls to the contact box (FR-6). The header is sticky: it stays at the top of the viewport while scrolling. At 640px and narrower, the links and the Get in touch button collapse into a menu: the bar shows the brand, the theme toggle and a menu button, and the menu opens a panel with Home, Projects and Blog (tap rows at least 48px tall, current page highlighted) and a full-width Get in touch button. The menu button sets `aria-expanded` and `aria-controls`; the menu closes on Escape and when a link is tapped; closing returns focus to the menu button.
- FR-26: The footer is a single compact row on every page: "© [current year] Darl Shanen Floresca" on the left (no site address), and Email, GitHub and LinkedIn as small icon links with no visible labels (the real GitHub and LinkedIn logos; each has an accessible name) on the right. On short pages the footer sits at the bottom of the viewport.
- FR-27: A project page has this structure: back link; header (title, summary, author, read time, then tags, then the facts card (Year, My role and Team in one row; Live site and Source in a second row, each a label with its link as the value, shown without the protocol; entries with no value are left out), all above the header border); a 16:10 cover (left out when no cover was uploaded); the markdown body; previous and next project links (in showcase order, FR-17); and a contact box.
- FR-28: A post page ends with "The project this post is about" (a featured-style project card, shown only when the post is linked to a published project) followed by previous and next post links (older and newer by `published_at`, published posts only) and then the contact box. It has no reactions, comments or newsletter.
- FR-29: The Home, Projects and Blog pages have designed empty states, with the wording in PRODUCT.md section 4.7: no featured project, no posts, no projects (filter chips hidden), no blog posts (filter chips hidden), and the launch state of one project and one post (no extra message; just the one featured project).
- FR-30: Unknown, unpublished and deleted URLs return a real HTTP 404 status and show the 404 page. Unexpected server errors show the 500 page (with Try again, Go home and an email link) and never show technical details; the error is logged on the server.
- FR-31: Every page has a unique title, a description (the post excerpt or project summary; fixed text for Home and the index pages), a canonical URL, Open Graph and Twitter card tags, and a preview image (FR-32). The site has a favicon and a `sitemap.xml` listing only published pages (Home, Projects, Blog and each published project and post), referenced from `robots.txt`. Admin pages are excluded.
- FR-32: There are two preview image designs at 1200×630: a site preview (hero headline, name, site address, grayscale photo) and a post preview ("Blog", date, read time, post title, small photo and name, site address). Home, the index pages and project pages use the site preview. Each published post gets its own post preview, generated from its title, date and read time. Generated images are cached, post titles are drawn as text (never interpreted as markup), and the image refreshes within the freshness window in PR-6 when a post is edited. Rendering uses `satori` with `@resvg/resvg-js` on request; images are cached per instance, keyed on the post's last edit, with the same short shared cache as pages. The grayscale photo comes from a generated `portrait-og.png` (`bun run og:portrait`).

**Admin**
- FR-8: `/admin` presents a login screen to unauthenticated visitors. No public page links to it.
- FR-9: Login uses Supabase Auth with the GitHub provider only.
- FR-10: After login, the server compares the GitHub account ID with the allowlist. A non-matching account is signed out immediately and denied.
- FR-11: The admin can create, edit, delete, publish and unpublish posts.
- FR-12: The post editor provides a markdown editor with a live preview that matches the public rendering. The editor has the usual writing shortcuts: Ctrl or Cmd+B (bold), I (italic), E (inline code) and K (link) wrap the selection, and pressing the same shortcut again takes the markers off; Ctrl or Cmd+Shift+8, 7 and . toggle bulleted lists, numbered lists and quotes on every selected line (the toolbar buttons do the same); Enter continues a list or quote and numbers the next item, and Enter on an empty item ends the list; Tab and Shift+Tab nest and lift a list item (Escape first lets Tab move focus on); pasting an address over selected text makes it a link; edits can be undone with Ctrl+Z. List and quote keys act as plain text inside a code block.
- FR-13: The admin can upload images to Supabase Storage for use as cover images and inside post and project markdown, and insert them while editing.
- FR-14: The admin can sign out.
- FR-15: The admin can create, edit, delete, publish and unpublish projects, using the same markdown editor with live preview for the case-study body (FR-12).
- FR-16: Marking a project as featured clears the featured flag on any other project, so at most one project is featured at a time.
- FR-17: The admin can set the order of projects on the showcase with move-up and move-down controls.
- FR-18: The post and project editors let the admin pick existing tags or create new ones inline (see tag rules in section 3.2).
- FR-19: A slug is generated from the title and editable until first publish; after that it is locked.
- FR-20: Destructive actions (delete post, delete project, delete tag) ask for confirmation.
- FR-21: The post and project editors warn before the admin leaves with unsaved changes, whether by refreshing, closing the tab, going back, or clicking a link inside the dashboard. The editor shows when there are unsaved changes. There is no autosave.
- FR-22: A failed save (including an expired session or lost connection) keeps everything typed in the editor on screen and shows a clear error, so nothing is lost and the admin can retry after signing in again.
- FR-33: The post editor has an optional "project this post is about" selector listing the projects, and it can be cleared.

### 3.2 Data requirements
Posts and projects are separate tables.

- `posts`:
  - id (unique identifier)
  - slug (unique; used in the URL; locked after first publish, FR-19)
  - title
  - excerpt (written by hand; shown on cards and used as the page description)
  - body (markdown source; the only stored copy, PR-5)
  - cover_image (storage path, not a full URL, so a bucket or domain change does not break it; optional)
  - cover_alt (alt text for the cover; required when a cover is set)
  - status (draft or published)
  - published_at (empty until first publish; drives the displayed date and sort order)
  - project_id (optional; the project this post is about, FR-28 and FR-33; if that project is deleted, this becomes empty)
  - created_at, updated_at
  - Read time is computed from the body when rendering, not stored. The same applies to case studies.
- `projects`:
  - id, slug (unique; locked after first publish, FR-19), title
  - summary (one or two sentences: what it is and who it is for)
  - body (markdown case study; optional, so a project can be a card only)
  - cover_image (storage path; optional), cover_alt (required when a cover is set)
  - live_url, repo_url (both optional)
  - year, role, team (optional; year and role show as the caption on cards, and all three show in the case-study facts card; team is short text such as "Solo" or "Team of 4")
  - first_published_at (set the first time the project is published and never cleared; the slug locks from then on, FR-19; posts use `published_at` for this)
  - featured (true/false; at most one true, FR-16)
  - sort_order (number; set through the move-up and move-down controls, FR-17)
  - status (draft or published)
  - created_at, updated_at
  - Tech and topics use the shared tags below.
- A missing cover falls back to the design system's muted placeholder, so content is never blocked on an image. Project covers are shown at 16:10 and post covers at 16:9.
- Not in the database: the About me content, the hero photo (a static asset with alt text) and the résumé file are part of the site's code and static assets (FR-23).
- Tags are shared across posts and projects:
  - `tags`: id, slug (unique), name. One row per tag, so "Svelte" exists once.
  - `post_tags`: post id and tag id, one row per pairing; the pair is unique.
  - `project_tags`: project id and tag id, one row per pairing; the pair is unique.
  - Deleting a post or project removes its link rows; deleting a tag removes its links but never the content. Tags with no content are allowed but not shown publicly.
  - Public filter chips list only tags used by published posts (blog) or by published projects (projects page), with counts computed from the link tables. Tag names are chosen from the existing list or created on demand in the admin, to prevent near-duplicates ("svelte" vs "Svelte").
  - RLS applies to all three tables like the content tables (SR-4).
- Markdown is rendered on request: `posts` and `projects` store only the markdown source (no stored HTML column). See PR-5.
- `rate_limits`: key (hashed IP + limit name), count, window start, blocked until. Internal; see SR-14.
- `admin_allowlist`: the GitHub numeric id allowed to write through Supabase's API (filled by `bun run db:allow-admin`). Internal; row level security on, no policies. Row level security policies call `public.is_admin()`, which checks the caller's GitHub identity against this table; `user_metadata` is never used because the user can edit it.
- Schema is defined in Drizzle and migrated with Drizzle's migration tooling.

### 3.3 External interfaces
- Supabase Auth (GitHub OAuth) for sign-in.
- Supabase Postgres, accessed server-side through Drizzle.
- Supabase Storage bucket for images: public read, admin-only write.

### 3.4 Security requirements
- SR-1: Identity is verified on the server with `getUser()` (validated by Supabase), not `getSession()`, in `hooks.server.ts`.
- SR-2: Every `/admin` route, form action and endpoint enforces authorization itself, not only the layout.
- SR-3: Authorization uses the stable numeric GitHub ID in an environment variable, never username or email.
- SR-4: Row Level Security is enabled on every table: public can read only published rows; writes only for the admin's user ID. Because Drizzle bypasses RLS, SR-1 to SR-3 are the primary control.
- SR-5: The service role key and database URL are server-only (`$env/static/private`).
- SR-6: Session cookies are managed with `@supabase/ssr`: httpOnly, Secure, SameSite=Lax.
- SR-7: All form and endpoint input is validated with Zod on the server.
- SR-8: Rendered markdown is sanitized before output so post content cannot execute scripts. Raw HTML in markdown is disabled, `rehype-sanitize` runs before the alerts and syntax-highlighting plugins, and those plugins must only emit fixed markup, never copy raw user strings into attributes. A test post with script and event-handler payloads must render inert.
- SR-9: Storage uploads are restricted by file type and size, and writable only by the admin. Allowed: JPEG, PNG, WebP, GIF and AVIF, up to 5 MB, checked from the file's own bytes (not its name or declared type); SVG is refused; object names are random. A cover image is removed from storage when it is replaced or its post or project is deleted (images pasted inside markdown are not tracked).
- SR-10: Security headers and a Content Security Policy are configured through SvelteKit; SvelteKit's same-origin form protection stays enabled.
- SR-11: `/admin` is `noindex` and disallowed in `robots.txt`.
- SR-12: Only the GitHub provider is enabled in Supabase Auth.
- SR-13: One shared render function is used by the public pages and the admin live preview, so what is previewed is what is published (FR-12).
- SR-14: The login surface is rate limited per client IP, using the shared `rate_limits` Postgres table (in-memory counters do not work on Vercel, where many short-lived instances run). The login surface is the `/admin` login page, the action that starts GitHub sign-in, and the OAuth callback.

  | Limit | Value |
  |---|---|
  | Sign-in start and callback requests | 10 per 10 minutes per IP (fixed window) |
  | Allowlist rejections (a non-owner GitHub account completes sign-in) | 3 per hour per IP, then that IP is blocked from the login surface for 1 hour |
  | Unauthenticated requests to other `/admin/*` routes | 30 per minute per IP |
  | Response when exceeded | HTTP 429 with a `Retry-After` header and a plain message; no detail about why |

  Store design: one row per limiter key (limit name + IP) holding a hit count, the window start, and an optional `blocked_until`. Each check is a single atomic upsert (`INSERT ... ON CONFLICT DO UPDATE`, via Drizzle) that increments the count or resets an expired window, so two simultaneous requests cannot both read the same stale count. The IP is stored as a keyed hash (HMAC with a server-only secret), never in plain text. Expired rows are deleted opportunistically during writes. The table has Row Level Security enabled with no policies, so it is unreachable through Supabase's public API and only the server's direct database connection can use it.

  Notes: limits are enforced server-side in `hooks.server.ts` before any auth call. If the database check fails, requests are allowed and the failure is logged (fail open), because the allowlist (SR-3) is the actual gate and failing closed could lock the owner out. A fixed window permits a short burst at a window boundary (up to twice the limit); acceptable at these values. The client IP comes from the platform-provided address (`getClientAddress()`), and the deployment must be configured so that value cannot be spoofed by request headers. Supabase Auth's own rate limits stay enabled as a second layer.

- SR-15: Code block headers (UR-9) are added after sanitizing, with fixed markup only. The language label comes from the code fence and is shown only if it matches a short allow-pattern (letters, digits, `+`, `#`, `-`, up to 20 characters); otherwise it is left out. The Copy button works through an event listener added by the site's script, never an inline handler, so the strict CSP (SR-10) holds. The same markup is used in the admin live preview (SR-13).

### 3.5 Performance requirements
- PR-1: Public pages are server-rendered with a short shared-cache window (`s-maxage=45` plus `stale-while-revalidate=10`, so a page is at most 55 seconds stale) so repeat requests do not always hit the database. Any stale-while-revalidate allowance is kept short (see PR-6).
- PR-2: Admin routes are never cached.
- PR-3: Images are sized and lazy-loaded appropriately, except images above the fold, such as the hero photo, which load right away so the first screen is not delayed. Fonts load with `font-display: swap`.
- PR-4: Prerendering or incremental regeneration will be reconsidered once there is real content and traffic.
- PR-5: Post markdown is rendered on request, not at save time. The markdown is the only stored copy of a post, so pipeline and sanitizer changes apply to every post immediately. Because each cache miss pays for rendering, PR-1's shared-cache headers are what keep reads fast, and the markdown processor (including the highlighter) is created once per server instance and reused, not rebuilt per request. If real traffic shows rendering is a bottleneck, revisit storing rendered HTML (a derived, disposable column).
- PR-6: Changes show up on the public site promptly. After a successful create, edit, publish, unpublish or delete, the affected public pages (the post or project page, its index, the Home page, and tag filter counts) reflect the change no later than 60 seconds afterwards. Preferred mechanism: the save action refreshes (revalidates) the affected pages on demand, if the hosting setup supports it. Fallback: rely on the short cache window in PR-1. The dashboard does not show a note about it: saves only confirm what happened ("Draft saved.", "Published.", "Unpublished.", "Saved.") Admin pages are never cached (PR-2), so the editor and preview always show the latest content.

### 3.6 Usability and accessibility
- UR-1: Follow the Shenanigans design system for tokens, components and page patterns.
- UR-2: Interactive elements show the design system's focus ring and are keyboard reachable.
- UR-3: The chosen theme (system by default, or the manual override) applies before first paint, so there is no flash of the wrong theme on load.
- UR-4: Pages are usable on mobile screens.
- UR-5: Both themes use the design system's light and dark tokens; no hardcoded colors outside the tokens.
- UR-6: Syntax highlighting is class-based (`hljs-*` classes), so it adds no inline styles and works with a strict CSP (SR-10). Code block colors, weights and italics come only from design system tokens and follow the active theme with no extra switching logic. The palette is monochrome by default (shade, weight, italics); adding a small set of muted syntax tokens to the design system is a later option if readability needs it.
- UR-7: GitHub-style alerts (note, tip, important, warning, caution) are styled from the same tokens as the design system's `Callout` component, in both themes. The five types are told apart by label and icon, with at most a slight tint; color is never the only cue.
- UR-8: Syntax comment and muted-text shades, and alert text, meet the contrast level the design system targets in both themes.
- UR-9: Code blocks in posts and case studies have a header bar with the language label and a "Copy" button. Pressing it copies exactly the code text (not the label), changes the button to "Copied" with a check for about two seconds, then reverts, and announces the change to screen readers. The button is a real, keyboard-focusable button with an accessible name such as "Copy code". Without JavaScript the language label still shows and the button is hidden.
- UR-10: Every public page and state works in light, dark and phone widths (the designs cover all three).
- UR-11: Public-site motion follows the Motion rules in DESIGN.md: one slide-in fade applied to whole sections (the first section on load, every other section the first time it scrolls into view), built with CSS and a small script (no animation library). Only `opacity` and `transform` animate, so there is no layout shift. With `prefers-reduced-motion: reduce`, with JavaScript off, or if hydration fails, all content is visible at once. Sections after the first are hidden only once the page has marked itself as running script, and a CSS fallback shows any section still hidden after 2.5 seconds. The strict CSP (SR-10) is not loosened. The admin has no entrances or scroll reveals.

### 3.7 Maintainability
- MR-1: The design foundations are defined once, in the Tailwind theme and CSS variables (light and dark), and shadcn-svelte components read them, so they take on the Shenanigans look without per-component restyling. Pieces specific to the design system (such as ProjectCard, PostCard, HeroTitle, CTABanner, NavBar and Footer) are custom Svelte components built with Tailwind utilities, following the design system's markup, rules and page patterns. The design system's reference bundle (React components and `sh-` classes) is a visual reference only and is not shipped.
- MR-2: Schema changes go through versioned Drizzle migrations.
- MR-3: Site-level styles, including the phone overrides, must load after or be more specific than the component styles, or the overrides will not apply. With Tailwind, use responsive variants and a deliberate layer order so shadcn-svelte component styles do not win.
- MR-4: Minor and patch updates of packages, and updates of the pinned actions, arrive as grouped weekly Dependabot pull requests, which run the same checks as any change (SR-16). Major versions are excluded from Dependabot and upgraded by hand, as one deliberate change: TypeScript 7 (typescript-eslint does not support it yet) and the vitest 5 family (which needs the three vitest packages moved together and async `render` in component tests) both broke the build as separate pull requests.

- SR-16: Automated security checks run in GitHub Actions on every push to `main`, every pull request, and weekly (new advisories appear without code changes). They never use `pull_request_target`, need no repository secrets, and fail the run when they find a problem. Five jobs:

  | Job | Guards against | Fails on |
  |---|---|---|
  | secrets | Leaked keys, tokens or `.env` files in any commit | Any finding (the history is clean, so there is no allowlist) |
  | dependencies | Known vulnerable packages | High or critical advisories (`bun audit`); on pull requests, added packages with high advisories |
  | code-analysis | Injection, XSS, unsafe redirects in our code | CodeQL `security-extended` alerts, lint errors (including `svelte/no-at-html-tags` and the bans on `eval`, `setTimeout` with a string, and `new Function`), type errors |
  | build-and-bundle | Server-only values reaching the browser (SR-5) | Any server-only variable name or value found in the client build |
  | security-tests | Broken access control and misconfiguration (SR-1 to SR-4, SR-7 to SR-11, SR-14) | Any failure in the project's own database, authorization, sanitizer, upload, rate-limit, header and login tests, run against a local Supabase stack. The route inventory requires one `requireAdmin(` call per load function, form action and endpoint under `/admin`, not just one per file |

  Third-party actions are pinned to commit hashes and kept current by Dependabot, which also proposes package updates. The five jobs are required status checks on `main` through a repository ruleset, so a red check or a pull request with merge conflicts cannot be merged. Dependency review needs the repository's dependency graph switched on. Only the security-relevant tests run in CI; the full suite (including the accessibility, motion and visual end-to-end tests) runs locally.

## 4. Verification
- Auth: confirm a non-allowlisted GitHub account is rejected and signed out; confirm direct requests to admin actions without a session fail.
- Visibility: confirm draft posts and draft projects never appear on public pages or in public queries.
- Projects admin: confirm marking a second project featured un-features the first; confirm reordering changes the showcase order; confirm a slug cannot be changed after first publish.
- Editor safety: with unsaved changes, confirm refresh, tab close, back navigation and in-dashboard links each trigger a warning; confirm a failed save (simulate an expired session and an offline connection) keeps the typed content and shows an error.
- Freshness: publish, edit, unpublish and delete a post and a project; confirm the public pages, indexes, Home and tag counts update within 60 seconds.
- Markdown editor: confirm the shortcuts, list continuation, Tab nesting and link paste in FR-12 work, and that Ctrl+Z undoes them.
- Rendering: confirm sanitized markdown strips script content; confirm alerts render as callouts.
- Themes: check both themes on all three public pages.
- Home and navigation: confirm the Home order (hero, About me, Featured, Latest posts, contact box, footer); confirm the hero has no status line and no Get in touch button in it; at 640px and narrower, confirm the menu opens, sets `aria-expanded`, closes on Escape and on link tap, and returns focus to the menu button; confirm the footer sits at the bottom on a short page. Confirm the header stays at the top while scrolling, Get in touch scrolls to the contact box on Home, project pages and posts and goes to Home's box from other pages, and the footer shows icons without labels.
- Pages and states: confirm each empty state (no featured project, no posts, no projects, no blog posts, one project and one post); confirm unknown, unpublished and deleted URLs return HTTP 404; trigger a server error and confirm the 500 page shows no technical details; confirm previous and next links follow showcase order for projects and `published_at` for posts; confirm "The project this post is about" appears only for a linked, published project.
- Metadata: confirm each page type has a unique title, description, canonical URL, Open Graph and Twitter tags and a preview image; confirm `sitemap.xml` lists only published pages and is referenced from `robots.txt`; confirm a new post's preview image shows its title, and that a title containing markup characters renders as plain text.
- Code blocks: confirm the language label and Copy button in a post and in the admin preview; confirm the copied text matches the code exactly, the button reads "Copied" for about two seconds, and a fence with an unsafe language label shows no label.
- Markdown styling: view a test post containing all five alert types and code blocks in several languages in both themes; confirm the browser console shows no CSP violations; check contrast of comments, muted shades and alert text in both themes.
- Rate limiting: confirm the 11th sign-in request in 10 minutes returns 429 with `Retry-After`; confirm the third allowlist rejection blocks that IP for an hour; confirm `X-Forwarded-For` spoofing does not change the counted IP; fire concurrent requests and confirm the count is exact (no lost increments); confirm the table is not readable through the Supabase API.

- CI security checks: prove each can fail on a throwaway branch (a fake key, a vulnerable package, an unsanitized `{@html}` or `eval`, a server variable in client code, a removed `requireAdmin(` call, a removed CSP) and confirm the run goes red; confirm the weekly and manual runs appear, Dependabot opens its first pull request, and CodeQL results show under Security. Done on 2026-11-01: every fault was caught except `eval` and a single removed guard in a file with several handlers, which led to the ESLint bans and the per-handler route inventory above.

## 5. Open issues
- Live scan of the deployed site (for example OWASP ZAP) is deferred until the first deployment.
- Done in the repository settings (not in code): a ruleset requiring the five CI jobs on `main`, the dependency graph, Dependabot alerts and security updates, and secret scanning with push protection.
- The accessibility, motion and visual end-to-end tests do not run in CI yet; adding them is a possible later step.
- TypeScript 7 waits for typescript-eslint support.
- Résumé file: still to be provided (FR-23). The button stays hidden until `static/resume.pdf` exists.
- RSS feed: still not planned.
- On-demand revalidation on Vercel (PR-6): the ISR route configuration is enabled on the public routes (`src/lib/server/isr.ts`, one-minute expiry as a safety net). Confirmed on the deployed site. Without the token (local), the short cache window applies.
- To verify after the first deployment: the native image renderer for preview images (FR-32), that a spoofed `X-Forwarded-For` does not change the counted IP (SR-14), and the Vercel adapter build.
- Settled since 0.2: the admin, login and 429 designs; how post previews are rendered (FR-32); the alert and `hljs-*` styles are monochrome and meet contrast in both themes (UR-6 to UR-8); blog pagination is 10 per page and tag filters live in the URL.
- Accessibility target: WCAG 2.1 AA at minimum (the design system's palette also meets 2.2 AA).
