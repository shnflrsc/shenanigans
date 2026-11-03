# DESIGN.md — Shenanigans

Oct 31, 2026 · @Darl Shanen Floresca · Motion rules confirmed

## How to use this file

This is the single source of truth for how Shenanigans looks and reads. Shenanigans is a personal portfolio and blog (projects showcase, posts, an admin dashboard) built with SvelteKit, shadcn-svelte and Supabase. Reactions, comments and a newsletter are in this system but are not used on Shenanigans. Any agent generating UI, styles or copy for it must follow this file.

- **Precedence:** an explicit instruction from the project owner > this file > existing code > the agent's own taste.
- **Tokens are law.** Never hard-code a color, size, radius, shadow or font. Use the CSS custom properties named here (for example `var(--ink)`, `var(--space-6)`).
- **Reuse before inventing.** Build from the components in this spec. A new component must be composed from existing tokens and match the nearest existing component's patterns.
- **Both themes, always.** Every surface and text pair must work in light and dark.
- **When unsure,** pick the quieter option and leave a TODO for the owner rather than adding decoration.

## Design principles

Shenanigans is monochrome, soft and elegant: a calm frame so the projects and the writing carry the personality. The name is playful; the interface stays composed.

1. **Content first.** Chrome is quiet. No decorative illustrations, textures, gradients or patterns. Motion on the public site is one slide-in fade, applied to whole sections; it only moves content into place, never decorates and never blocks reading.
2. **Hairlines, not boxes.** Separate with 1px lines and quiet fills before reaching for borders, shadows or color.
3. **Warm monochrome.** Warm off-whites and warm greys only. No hue, no pure black, no pure white text in dark.
4. **Soft everywhere.** Every corner is rounded; bigger surfaces get bigger radii.
5. **One loud thing per view.** At most one primary button and one raised surface per screen area.
6. **Generous whitespace.** When in doubt, add space rather than a divider.
7. **Two voices in type.** Space Grotesk for reading, Space Mono for anything counted or labelled.

## Color

Fifteen semantic tokens, each with a light and a dark value. Use the token name, never the hex. Dark is a full theme, not an inversion: near-black grounds, off-white text, elevation by lighter surfaces.

| Token | Light | Dark | Use for |
| --- | --- | --- | --- |
| `paper` | `#ffffff` | `#191919` | Page background, cards, nav bar |
| `paper-soft` | `#f7f7f5` | `#202020` | Soft sections, quotes, callouts, code blocks, closing call-out, footer |
| `paper-raised` | `#ffffff` | `#252525` | Raised cards, menus, popovers (dark lifts by lightness) |
| `fill-muted` | `#efefed` | `#2c2c2c` | Tags, inline code, image placeholders, inactive dots |
| `fill-hover` | `rgba(55,53,47,.06)` | `rgba(255,255,255,.06)` | The only hover/pressed fill for quiet controls |
| `ink` | `#37352f` | `#ebebea` | Headings, primary text, primary button fill |
| `ink-muted` | `#5f5e5b` | `#bdbdbb` | Body copy, descriptions, tag text |
| `ink-subtle` | `#6e6d69` | `#999997` | Captions, dates, soft headline runs, inactive nav, icons |
| `on-ink` | `#ffffff` | `#191919` | Text and icons on an `ink` fill |
| `line` | `#e9e9e7` | `#2f2f2f` | Dividers, outline-card borders (decorative) |
| `line-strong` | `#d3d2ce` | `#434341` | Secondary button, arrow button and input borders |
| `edge-highlight` | transparent | `rgba(255,255,255,.07)` | 1px top highlight on raised surfaces |
| `image-overlay` | transparent | `rgba(0,0,0,.12)` | Wash over project and post images |
| `selection` | `rgba(55,53,47,.14)` | `rgba(255,255,255,.18)` | Text selection |
| `scrim` | `rgba(15,15,15,.4)` | `rgba(0,0,0,.6)` | Backdrop behind dialogs, lightboxes, mobile menu |

**Rules**

- The only solid dark surfaces are the primary button and an active filter tag (`ink` + `on-ink`). No black bands or sections.
- Alternate `paper` and `paper-soft` sections; never stack two soft sections.
- `ink-subtle` is for `paper`, `paper-soft` and `paper-raised` only, never on `fill-muted` (use `ink-muted` there).
- Borders are never the only cue: a control's label or icon carries its meaning.
- Photos and portraits are grayscale (`filter: grayscale(1)`); screenshots keep their color but sit under `image-overlay`.

## Typography

Two families, both from Google Fonts: **Space Grotesk** (weights 400, 500, 600, 700) as `--font-sans` for reading, and **Space Mono** (400, 700) as `--font-mono` for anything counted or labelled.

```css
--font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
--font-mono: "Space Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

| Style | Family | Size / line height | Weight | Tracking | Use for |
| --- | --- | --- | --- | --- | --- |
| `hero` | sans | 56 / 62px | 600 | -0.035em | Home intro headline, once per page |
| `post-title` | sans | 44 / 52px | 600 | -0.03em | Post and case-study titles |
| `title` | sans | 36 / 44px | 600 | -0.025em | Section headings |
| `prose-h2` | sans | 26 / 34px | 600 | -0.02em | Headings inside a post |
| `quote` | sans | 22 / 32px | 400 | -0.01em | Testimonials, pull quotes |
| `lead` | sans | 20 / 30px | 400 | 0 | Subtitles and intros, in `ink-muted` |
| `prose-h3` | sans | 20 / 28px | 600 | -0.01em | Sub-headings inside a post |
| `card-title` | sans | 17 / 24px | 600 | -0.01em | Project and post titles in cards and lists, names |
| `prose` | sans | 17 / 30px | 400 | 0 | Post body text |
| `body` | sans | 16 / 26px | 400 | 0 | Paragraphs, accordion answers |
| `small` | sans | 14 / 22px | 400 | 0 | Card copy, excerpts, footer links |
| `ui` | sans | 14 / 20px | 500 | 0 | Buttons, nav links, form labels |
| `stat` | mono | 36 / 40px | 400 | -0.03em | Big numbers |
| `code` | mono | 14 / 22px | 400 | 0 | Code blocks; inline code at 0.85em |
| `caption` | mono | 11 / 16px | 400 | 0.04em, uppercase | Dates, years, read times, roles, tags, credits |

**Rules**

- Headlines are sentence case, SemiBold, tracked tight.
- A headline may have one softer second half in `ink-subtle`: "Hi, I build things. *Sometimes they even work.*" Never more than one soft run, and never bold-word emphasis.
- Mono is never used for paragraphs.
- Post bodies are at most 680px wide (about 70 characters a line).

## Spacing, shape, depth and motion

All spacing sits on a 4px base; corners grow with the surface; depth is rare and soft.

| Spacing | Value | Typical use |
| --- | --- | --- |
| `space-1` | 4px | Icon-to-label gap |
| `space-2` | 8px | Between nav links and small controls |
| `space-3` | 12px | Button padding; title to its copy |
| `space-4` | 16px | Small card padding; gaps in stacks |
| `space-6` | 24px | Card padding; gap between cards |
| `space-8` | 32px | Section title to its content |
| `space-12` | 48px | Call-out padding; footer column gap; space above post `h2` |
| `space-16` | 64px | Page side gutters on desktop |
| `space-24` | 96px | Vertical padding of every section |

| Radius | Value | Use for |
| --- | --- | --- |
| `radius-sm` | 4px | Tags, small buttons, accordion rows, inline code |
| `radius-md` | 6px | Buttons, inputs, arrow buttons, nav links, callouts |
| `radius-lg` | 10px | Cards (Frame), images, code blocks |
| `radius-xl` | 16px | The closing call-out card only |
| `radius-full` | 9999px | Avatars, reactions, pagination dots |

**Lines:** every border and divider is `stroke-hairline` (1px). The one exception is the Prose blockquote rule (3px, `ink`).

**Shadows:**

- `shadow-sm` — secondary buttons at rest. Light `0 1px 2px rgba(15,15,15,.06)`; dark `0 1px 2px rgba(0,0,0,.4)`.
- `shadow-md` — raised cards, menus, popovers and card hover. Light: a 1px 5% ring plus 3/6px and 9/24px soft drops. Dark: a 1px white 6% ring plus 4/12px and 12/32px drops at 50%, always paired with `paper-raised` and an inset `edge-highlight`.
- No other shadows. Never use shadow for depth on sections.

**Motion (public site).** One idea: whole sections slide in and fade in. A section is a unit (the hero, About me, Featured, Latest posts, the contact box, the header block of a page); it moves as one piece, never element by element. Nothing else on the public site is animated for now.

| Token | Value | Use for |
| --- | --- | --- |
| `--motion-slow` | 600ms | The slide-in fade |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | The slide-in fade |
| `--rise` | 24px | How far a section travels while it fades in |

- **The one animation: slide-in fade.** A section starts 24px lower and transparent and ends in place and fully visible, over `--motion-slow` with `--ease-out`.
- **On load.** The first section of the page (the hero on Home, the title block on other pages) plays it once as the page appears. The header and footer do not animate.
- **On scroll.** Every other section plays it the first time it comes into view, once only; scrolling back up does not replay it. Sections already on screen when the page loads are not hidden.
- **Whole sections only.** The children of a section (headline lines, buttons, cards, rows, chips, the photo) never have their own timing, delay or stagger.
- **Not animated for now:** hover and press effects, focus ring fades, link underlines, page-to-page transitions, the theme switch, springs and staggers. Existing plain colour, border and shadow transitions (150–200ms) stay as they were.
- **Banned:** parallax, spin, looping or continuous motion, bounce, anything that follows the pointer, movement that makes text hard to read or a control hard to hit.
- **Reduced motion.** With `prefers-reduced-motion: reduce` nothing slides or fades; every section is simply shown. Nothing waits for an animation to become visible.
- **Without JavaScript, or if it fails.** Content is always visible. Sections after the first start hidden only once the page has marked itself as running script (before first paint, so there is no flash); each is shown the first time 5% of it is on screen, including a section peeking into the first screen. If that script never runs, a CSS fallback shows every section after 2.5 seconds.
- **Performance.** Only `opacity` and `transform` animate, with no layout shift (CLS stays 0). The hero photo is never faded on its own.
- **Admin.** No entrances or scroll reveals: only the 150–200ms transitions on background, border, color and shadow, plus the standard enter and exit of dialogs, menus and toasts.

Accordion chevrons rotate 90°.

**Focus:** `focus-ring` = a 2px ground-colored gap, then 2px solid `ink` (light `0 0 0 2px #fff, 0 0 0 4px #37352f`; dark `0 0 0 2px #191919, 0 0 0 4px #ebebea`), on `:focus-visible` only.

## Layout and surfaces

Pages are a vertical stack of full-width sections, each holding one centered container; every card sits on a Frame.

**Containers**

| Width | Max width | Use for |
| --- | --- | --- |
| `narrow` | 720px | Posts, case studies, About text |
| `default` | 1080px | Most sections, nav, footer |
| `wide` | 1280px | Large project galleries |

- Sections: `space-24` top and bottom, `space-16` side gutters on desktop, `space-6` on mobile. Tone `plain` (`paper`) or `soft` (`paper-soft`); add a top `line` hairline when two plain sections meet.
- Grids: project cards 2 or 3 columns, gap `space-6`; collapse to 1 column below 720px. The post index is a single-column list.
- Breakpoints: mobile < 720px, tablet 720–1023px, desktop ≥ 1024px. Scale `hero` to 40/46px and `title` to 28/36px on mobile.

**Frame (the base surface)**

| Variant | Background | Edge | Use for |
| --- | --- | --- | --- |
| `outline` (default) | `paper` | 1px `line` | Project cards, post cards, tiles |
| `soft` | `paper-soft` | none | Quotes, the closing call-out |
| `raised` | `paper-raised` | `shadow-md` + inset `edge-highlight` | The one thing that floats: menus, popovers, a spotlight card |

- Corners `radius-lg`; padding `none` (0), `sm` (16px), `md` (24px, default), `lg` (48px).
- `interactive` cards switch to the raised treatment on hover and keep the whole card clickable through a stretched title link.
- One Frame treatment per row; never nest a Frame inside a Frame.

## Components

Twenty-five components cover the whole site. Build pages only from these; each spec lists anatomy, variants and the rules that matter. Class names use the `sh-` prefix.

### Actions and forms

| Component | Anatomy and sizes | Variants / key props | Rules |
| --- | --- | --- | --- |
| Button | `ui` text, 8px icon gap, `radius-md`; heights sm 28 / md 36 / lg 44px, padding 12 / 16 / 24px | `primary` (`ink` fill, `on-ink` text), `secondary` (`paper`, `line-strong` border, `shadow-sm`), `ghost` (transparent, `fill-hover` on hover); `arrow`; `href` renders a link | One primary per view. Sentence case, 2–3 words. Hover: primary 88% opacity, secondary `paper-soft`, ghost `fill-hover`. |
| ArrowButton | 32px square, `radius-md`, 16px chevron at 1.75px stroke | `secondary` (default, bordered), `ghost` | Always a specific `aria-label` ("Next screenshot"). |
| Tag | 24px tall chip, `fill-muted`, `ink-muted` 12px/500 text, `radius-sm` | Static; filter toggle when clickable (30px, `line` border, active = `ink` fill + `on-ink`); optional mono `count` | Filter tags use `aria-pressed`. Short labels. |
| PaginationDots | 6px dots, 6px gap; active dot stretches to 18px in `ink` | `count`, `active` | Each dot is a button with "Go to slide n". |
| TextField | `ui` label above, input 36px min, `line-strong` border, `radius-md`, 12px side padding; optional 12px hint in `ink-subtle` | `multiline` (textarea, 96px min, vertical resize) | Never use the placeholder as the label. Hint wired with `aria-describedby`. |

### Navigation

| Component | Anatomy | Rules |
| --- | --- | --- |
| NavBar | 56px tall on `paper`, 1px `line` underneath, 1080px container: wordmark left, link pills (32px, `radius-md`, `ink-subtle`), theme toggle and one small primary "Get in touch" button right | Current page = `ink` on `fill-hover` with `aria-current="page"`. Sticky (`position: sticky`, top 0). The name is set in type; the logo (two concentric circles, `#37352f` and `#6e6d69`) is the favicon and app icon only, not in the header. |
| SocialLinks | Row of 32px ghost icon buttons, 16px line icons in `ink-subtle`, `ink` on hover | Every link has an accessible label. Generic glyphs only. |
| Footer | `paper-soft` with top hairline, one compact row: mono `caption` copyright with the full name on the left, ghost icon links with no labels (Email, GitHub, LinkedIn, using the real brand logos) on the right. No brand block, link columns, tagline or site address | Never a dark band. Sits at the bottom of the viewport on short pages. |
| PostNav | Two outline Frames side by side: mono "Previous" / "Next" caption + `card-title` | A missing side leaves its slot empty. |

### Typography and layout

| Component | Anatomy | Rules |
| --- | --- | --- |
| HeroTitle | Optional 72px round grayscale avatar, optional status line with a 6px `ink` dot (not used on Shenanigans), optional Eyebrow, `hero` headline, `lead` subtitle (max 560px), up to two buttons | Centered by default, `align="start"` for left. One per page. |
| SectionTitle | Optional Eyebrow, `title`, optional `body` description in `ink-muted` | Left by default; center only above grids. |
| Eyebrow | Mono uppercase `caption` on `fill-muted`, `radius-sm`, 2px × 8px padding | One or two words above a title. |
| Prose | 680px column, `prose` text; `h2`/`h3`, links underlined in `line-strong` (ink on hover), lists with `ink-subtle` markers, blockquote with 3px `ink` rule, inline code on `fill-muted`, `pre` on `paper-soft` with `radius-lg`, rounded images, hairline `hr` | Wrap rendered Markdown in it. |
| Section | See Layout | Tone `plain`/`soft`, width, `divider`. |
| Frame | See Layout | Variant, padding, `interactive`. |

### Portfolio and blog

| Component | Anatomy | Rules |
| --- | --- | --- |
| ProjectCard | Outline Frame, no padding: 16:10 cover (with `image-overlay`), then 24px body: mono year / role, `card-title`, `small` description, Tags, ghost links (arrow or external icon) | Whole card clickable via title link. `featured` = image left 1.3fr, body right, 24px title; one per page. |
| Stat | Mono `stat` number over `small` label | 2–4 in a row; real numbers only. |
| PostCard | `row` (default): 112px mono date column, title, excerpt, Tags + read time, hairline below, `fill-hover` on hover. `card`: outline Frame with 16:9 image | Row for indexes, card for "latest posts". |
| PostHeader | Tags, `post-title`, `lead` subtitle, byline (32px avatar, name, mono date / read time), hairline below | Sits in a narrow section above Prose. |
| Callout | `paper-soft` (or outline) box, `radius-md`, 16px padding, 18px info icon in `ink-subtle`, 15/24px text | 1–2 per post. |
| ReactionBar (not used on Shenanigans) | 32px pill toggles (`radius-full`, `line` border): line icon, label, mono count | Pressed = `ink` border, filled icon, `aria-pressed`. Defaults Like, Insightful, Fun. No emoji. |
| Comment (not used on Shenanigans) | 32px avatar, name 14/600 + mono date, 15/24px body in `ink-muted`, ghost "Reply"; replies indented 16px behind a 1px `line` thread | One level of nesting. Comment box = TextField + small primary Button. |
| QuoteCard | Soft Frame, `lg` padding: `quote` text, person (36px avatar, name, role), optional arrow buttons right | One quote at a time. |
| Accordion | Hairline rows, 14px chevron rotating 90° open, question in 15px/500, answer indented 30px in `ink-muted` | One open at a time; `aria-expanded` + `aria-controls`. |
| CTABanner | Soft Frame, `radius-xl`, 48px padding, centered `title` (optional soft run), description, 1–2 actions or an email field + button | One per page, before the footer. |

## Page patterns

Every page starts with NavBar and ends with Footer; between them, sections alternate `plain` and `soft`.

| Page | Sections, top to bottom |
| --- | --- |
| Home | HeroTitle (headline, subtitle, View projects and Read the blog, photo with name and caption; no status line, no Get in touch) · About me (catchphrase, bio, quick-facts Frame, Skills and tools, Experience and highlights, résumé button when the file exists) · SectionTitle + the one `featured` ProjectCard (soft) · SectionTitle + latest PostCard rows · CTABanner "Got something in mind?" |
| Projects index | SectionTitle · row of filter Tags · ProjectCard grid, 2–3 columns |
| Project case study | PostHeader (year, role, tags) · hero image in `radius-lg` · Prose with Callouts and screenshots · links (live, source) · PostNav |
| Blog index | SectionTitle · filter Tags with counts · PostCard rows (newest first) · pagination |
| Post | PostHeader · Prose (narrow) · "The project this post is about" (featured ProjectCard, only for a published linked project) · PostNav (older and newer). No reactions, comments or newsletter |
| About | Not a page: it is the About me section on Home |
| Admin | Sidebar shell (paper-soft, 232px) on desktop; top bar and a three-way section switcher on phones. Lists use a table with status badges. Editors: sticky top bar whose status chip doubles as the save state (Draft, Published, Unsaved changes, Saving…, Not saved), main column (title, markdown with toolbar and live Prose preview), settings Frame (status, slug, excerpt or summary, tags, cover with required alt text); secondary "Save draft" + primary "Publish". Destructive actions use the primary button with an explicit verb, never red. See the admin design for every state |
| 404 | Centered HeroTitle with a playful line and one "Back home" button |

Empty and error states use the same pieces: a title inside a soft Frame, with one ghost or secondary button to recover; admin empty states have a title only, no subtitle. The admin lists show no loading skeleton: switching between All, Published and Drafts keeps the current list on screen until the new one arrives.

## Content and voice

Write in first person, "I" to "you": friendly, honest and a little playful. The design is calm, so the words carry the mischief.

- Short, plain sentences, one idea each. No jargon unless the post teaches it.
- Headlines: sentence case, optional softer second half ("Selected work. *The rest is on the blog.*").
- Project descriptions: what it is and who it is for, in one or two sentences. The case study holds the rest.
- Post excerpts promise one concrete takeaway.
- Buttons: sentence case, 2–3 words, verb first ("View projects", "Read the blog", "Get in touch").
- No exclamation marks in UI chrome; no emoji anywhere in the interface.
- Formats: dates "Oct 28, 2026" (mono caption shows it uppercase), read time "6 min read", years "2026".
- Playful copy lives in safe spots: the 404 page, empty states, the footer credit, the status line. Never in errors that block someone.

## Accessibility

Target WCAG 2.2 AA in both themes; the palette already meets it when tokens are used as specified.

| Text token | On `paper` (light / dark) | On `paper-soft` (light / dark) |
| --- | --- | --- |
| `ink` | 12.3 / 14.7 : 1 | 11.4 / 13.7 : 1 |
| `ink-muted` | 6.5 / 9.3 : 1 | 6.0 / 8.7 : 1 |
| `ink-subtle` | about 5.0 / 6.2 : 1 | about 4.7 / 5.7 : 1 |
| `on-ink` on `ink` | 12.3 / 14.7 : 1 | — |

- Body text ≥ 4.5:1; large text (24px+) and icons ≥ 3:1. Check any new pair in both themes before using it.
- Every interactive element shows `focus-ring` on `:focus-visible`; never remove outlines without it.
- Touch targets at least 32 × 32px (44px preferred on mobile nav).
- Icon-only buttons and links have an `aria-label`; toggles use `aria-pressed`; disclosure uses `aria-expanded`; the current nav link uses `aria-current="page"`.
- Form fields have visible labels; hints and errors are linked with `aria-describedby`.
- Images need meaningful `alt`; decorative ones `alt=""`.
- Honor `prefers-reduced-motion` and `prefers-color-scheme` (default theme follows the system, with a manual toggle).

## Implementation

Tokens ship as CSS custom properties: light on `:root`, dark under `[data-theme="dark"]` on `<html>`. This block is the canonical token file; components reference only these names.

```css
:root, [data-theme="light"] {
  --paper: #ffffff; --paper-soft: #f7f7f5; --paper-raised: #ffffff;
  --fill-muted: #efefed; --fill-hover: rgba(55, 53, 47, 0.06);
  --ink: #37352f; --ink-muted: #5f5e5b; --ink-subtle: #6e6d69; --on-ink: #ffffff;
  --line: #e9e9e7; --line-strong: #d3d2ce;
  --edge-highlight: rgba(255, 255, 255, 0); --image-overlay: rgba(0, 0, 0, 0);
  --selection: rgba(55, 53, 47, 0.14); --scrim: rgba(15, 15, 15, 0.4);
  --shadow-sm: 0 1px 2px rgba(15, 15, 15, 0.06);
  --shadow-md: 0 0 0 1px rgba(15, 15, 15, 0.05), 0 3px 6px rgba(15, 15, 15, 0.06), 0 9px 24px rgba(15, 15, 15, 0.08);
  --focus-ring: 0 0 0 2px #ffffff, 0 0 0 4px #37352f;
}
[data-theme="dark"] {
  color-scheme: dark;
  --paper: #191919; --paper-soft: #202020; --paper-raised: #252525;
  --fill-muted: #2c2c2c; --fill-hover: rgba(255, 255, 255, 0.06);
  --ink: #ebebea; --ink-muted: #bdbdbb; --ink-subtle: #999997; --on-ink: #191919;
  --line: #2f2f2f; --line-strong: #434341;
  --edge-highlight: rgba(255, 255, 255, 0.07); --image-overlay: rgba(0, 0, 0, 0.12);
  --selection: rgba(255, 255, 255, 0.18); --scrim: rgba(0, 0, 0, 0.6);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 4px 12px rgba(0, 0, 0, 0.5), 0 12px 32px rgba(0, 0, 0, 0.5);
  --focus-ring: 0 0 0 2px #191919, 0 0 0 4px #ebebea;
}
:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px;
  --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 10px; --radius-xl: 16px; --radius-full: 9999px;
  --stroke-hairline: 1px;
  --motion-slow: 600ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --rise: 24px;
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Space Mono", ui-monospace, "SF Mono", Menlo, monospace;
}
```

**Stack notes (SvelteKit + shadcn-svelte + Supabase)**

- The token file lives in `src/lib/styles/tokens.css`, imported once from the root stylesheet. Tailwind's theme (`@theme inline`) reads the tokens at run time, so both themes work with no per-component switching. The shadcn-svelte colour names (`--background`, `--primary`, ...) are mapped onto the tokens; destructive maps to `ink` because the design uses no red.
- Fonts are self-hosted from `@fontsource` packages (Space Grotesk as the variable font, registered as "Space Grotesk Variable", and Space Mono 400 and 700) with `display=swap`; there is no request to Google Fonts.
- Everything is a Svelte component and pages are server-rendered. The type styles are Tailwind utilities (`text-hero`, `text-card-title`, `text-caption`, ...), not `sh-` classes.
- Set the theme before first paint: a tiny inline script in `app.html` reads the saved choice or `prefers-color-scheme` and sets `data-theme` on `<html>`, so there is no flash. It carries the CSP nonce.
- Rendered markdown goes through one shared function and is wrapped in `.prose-shenanigans`; code uses class-based `hljs-*` colours made only of tokens.
- Photos are grayscale (the `grayscale` utility on the page, a pre-converted PNG for link previews).
- Lint and the type check run in CI on every change. The automated accessibility, contrast, motion and visual tests run locally for now (SOFTWARE.md section 5). The pipeline adds no visual change and no UI of its own.

## Agent checklist

Run this before handing back any UI work.

| Do | Don't |
| --- | --- |
| Use token variables for every color, size, radius and shadow | Hard-code hex values, px sizes or new shadows |
| Use warm greys from the palette | Add any hue, gradient, pure black `#000` or pure white text in dark |
| Separate with hairlines, quiet fills and space | Add heavy borders, boxed sections or dark bands |
| Round every corner with the radius scale | Leave sharp corners or invent radii |
| Keep one primary button and one raised surface per area | Stack several primary buttons or shadows |
| Use Space Grotesk for text, Space Mono for numbers, dates and labels | Set paragraphs in mono or add another font |
| Give headlines at most one soft `ink-subtle` run | Use bold-word emphasis, all caps headlines or emoji |
| Check light and dark, focus states, contrast and reduced motion | Ship a component tested in one theme only |
| Compose new UI from the listed components | Add doodles, dot grids, tilted frames, textures or decorative illustrations |
| Keep posts at 680px and sections at 1080px | Let text run full width |
| Keep `bun run lint` and `bun run check` passing (CI enforces them) and run the accessibility e2e suite locally before handing back UI work | Merge UI work with a red check, or switch a rule off to get past it |
