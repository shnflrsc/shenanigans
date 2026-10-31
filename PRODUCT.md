# Shenanigans: Product Requirements Document

Version 0.4 · 2026-10-31 · Owner: Darl

## 1. Purpose

Shenanigans is a personal portfolio website with a project showcase and a blog. It exists to present my work to employers and to share what I learn with other developers.

## 2. Goals

- Show a small set of real projects clearly enough that a recruiter understands each one in under a minute.
- Publish projects write-ups, guides and similar posts that developers and learners can read comfortably.
- Get the site running. There is no launch event, no growth target and no success metrics.

### Non-goals

- Reader interaction: no reactions, no comments, no newsletter.
- Analytics or tracking.
- Multiple authors or multiple admins.
- A separate About page. About lives as a section on Home instead (section 4.4).

## 3. Audience

Two groups, weighted equally:

1. Employers and recruiters, who skim for what I built and how to contact me.
2. Developers and learners, who read the blog and the project write-ups.

Meaningful traffic is expected, so the public pages must stay fast.

## 4. Scope

### 4.1 Public site

| Page | Purpose |
|---|---|
| Home | Hero, About me, the featured project, latest posts, contact box |
| Projects | Showcase of projects with tag filters, each with a case-study page |
| Blog | List of posts with tag filters, each with a post page |
| Empty and error states | 404, 500, and empty states for Home, Projects and Blog (section 4.7) |

Order on Home: Hero, About me, Featured, Latest posts, contact box, Footer.

### 4.2 Admin

- One admin: me, signed in with my own GitHub account.
- The dashboard manages both blog posts and projects (create, edit, publish, unpublish, delete). Projects are managed in the dashboard too, so no separate tooling is needed to add one.
- Posts and project case studies are written in markdown with a live preview.
- Tags are chosen or created while editing. For projects, I can also mark one as featured and set the order projects appear in.
- Reached only by typing `/admin`. No login button or link appears anywhere on the public site.

### 4.3 Contact and social

- Contact is an email link (floresca.shanegarcia@gmail.com). There is no contact form.
- Social links: GitHub and LinkedIn.
- Where contact appears: a "Get in touch" button in the header, the contact box at the end of Home ("Got something in mind? Let's talk." with Get in touch, GitHub and LinkedIn), and Email, GitHub and LinkedIn links in the footer.

### 4.4 Home page

- **Hero:** headline "Hi, I build things. *Sometimes they even work.*" with the second line in the softer ink-subtle color; subtitle "IT student and developer. This is where I keep my projects and write about what I learn along the way."; buttons "View projects" (primary) and "Read the blog" (secondary). There is no "Get in touch" button and no status line in the hero.
- **Hero photo:** my photo, grayscale, 4:5, rounded, on the right, with my full name (Darl Shanen Floresca) and the caption "BSIT student · Bulacan State University". On phones the photo stacks below the text.
- **About me** (replaces the dropped About page), right after the hero:
  - the catchphrase as a large line ("Jack of all trades, incompetent at none.");
  - a short bio: how I got into programming, what I am improving, hobbies;
  - a quick-facts card: studying, school, based in, graduating year, open to, languages;
  - "Skills and tools" as tag chips grouped as Languages, Frontend, Backend & data, Tools, Learning now;
  - an "Experience and highlights" timeline: year, title, one-line detail;
  - a "Download résumé" button (the résumé file is still to come).
- **Featured:** shows only the one featured project, with no grid of other projects below it. Featured and Latest posts have no section subtitles.
- **Latest posts,** then the contact box and footer.

### 4.5 Navigation and footer

- **Header on desktop:** brand "Shenanigans", links Home, Projects and Blog, then on the right a subtle theme toggle (icon button, no border) and a primary "Get in touch" button that opens an email.
- **Header on phones (640px and narrower):** the links and the Get in touch button collapse into a menu. The bar shows the brand, the theme toggle and a menu button. The menu opens a panel with Home, Projects and Blog (large tap rows, current page highlighted) and a full-width Get in touch button.
- **Footer:** one compact row on every page. Left: "© 2026 Darl Shanen Floresca" (the year updates automatically; the site address is not repeated). Right: Email, GitHub and LinkedIn as small links with an icon and a label. No brand block, link columns or tagline. On short pages the footer sits at the bottom of the screen.

### 4.6 Project and post pages

- **Projects and Blog pages:** titles keep a soft second half ("Projects. *Things I have built.*" and "Blog. *What I learn while building.*") with no subtitles. Tag filter chips with counts stay.
- **Project case study:** a back link; a header with title, summary, tags, author, "Case study" and read time; a facts card (Year, My role, Team, and links to the live site and source); a 16:10 cover; the markdown body; previous and next project links; and a contact box. Suggested sections for writing a case study (a guide, not enforced): intro, The problem, What I did, The result, What I'd change.
- **Post:** header, body, then "The project this post is about" (a featured-style project card, shown only when the post is linked to a published project) and previous and next post links. No reactions, comments or newsletter.
- **Code blocks** in posts and case studies have a header bar with the language label and a "Copy" button that changes to "Copied" with a check for about two seconds.

### 4.7 Empty and error states

- **Home, no featured project:** "Nothing featured right now" with a "See all projects" button.
- **Home, no posts:** "No posts yet. The first one is in the works."
- **Projects, none:** "No projects yet. They're on the way." Filter chips hidden; buttons "Read the blog" and "Go home".
- **Blog, none:** "Nothing here yet. The first post is in the works." Filter chips hidden; buttons "View projects" and "Go home".
- **Launch state (one project, one post):** Home shows the one featured project plus "More projects are on the way."
- **404:** "This page wandered off. Or it was never here." with buttons Go home, View projects and Read the blog. It also covers unpublished and deleted content.
- **500:** "Something broke on my end. Not yours." with buttons Try again and Go home, and an email link.

### 4.8 Link previews and metadata

- Every page has a title, a description (from the post excerpt or the project summary) and a preview image.
- Two 1200×630 preview images are designed: a site preview (hero headline, name, site address, grayscale photo) and a post preview ("Blog", date, read time, post title, small photo and name, site address).
- The site also has a favicon and a sitemap.

## 5. Content

- **Projects** and **posts** are different kinds of content and are managed separately.
- Posts can include callouts written as GitHub-style alerts (for example `> [!NOTE]`).
- Posts and project pages can include images.
- A post can be linked to one project, shown at the end of the post as "The project this post is about".
- The About me content (bio, quick facts, skills, experience) is written by me and kept with the site's code, not managed in the dashboard. Changing it means redeploying.
- A résumé file is offered as a download from About me. The file is still to come.
- Minimum content to go live: 1 project and 1 post.

## 6. Experience and design

- Visual language: the Shenanigans design system (monochrome, soft and elegant; Space Grotesk and Space Mono).
- Light and dark themes. The site follows the visitor's system setting by default, with a manual toggle to override it. The design system includes dark-theme tokens.
- Every public page and state is designed in light, dark and phone widths.
- Motion: the public site is lively. Content arrives with a staggered rise and fade, sections reveal as you scroll, pages and themes cross-fade, and buttons and cards respond to the pointer. It is always quick, never decorative, and switched off for visitors who ask for reduced motion. The admin stays quiet.
- Portraits and the hero photo are grayscale.
- Voice: first person, friendly, honest, a little playful, as described in the design system.
- Not used from the design system: reactions, comments and the newsletter banner.

## 7. Hosting and address

- Hosted on Vercel.
- Domain: shenanigans.is-a.dev.

## 8. Product decisions log

| Decision | Choice | Replaced or dropped |
|---|---|---|
| Framework | SvelteKit, dynamic site | Astro with Svelte islands, static rebuild on publish |
| Hosting | Vercel | Render (dropped earlier) |
| Reader interaction | None | Reactions, comments, newsletter |
| Editor | Markdown with live preview | Rich-text / WYSIWYG |
| Callouts | GitHub-style alerts | |
| Pages | Home, Projects, Blog | About page |
| Posts and projects | Separate entities, shared tags | |
| Admin scope | Manages posts and projects | Posts only (earlier plan) |
| Themes | Light and dark; follow system with manual toggle | |
| About | A section on Home, right after the hero | A separate About page |
| Hero | Photo, name and caption; buttons View projects and Read the blog | A status line; a Get in touch button in the hero |
| Featured | Shows only the one featured project | A featured project plus a grid of other projects |
| Header | Get in touch button and theme toggle; a menu on phones | |
| Footer | One compact row: copyright with my full name, plus Email, GitHub and LinkedIn with their logos | Brand block, link columns, tagline and the site address |
| Section subtitles | Removed from Featured, Latest posts, Projects and Blog | |
| Code blocks | Language label and a Copy button | |
| Post and project | A post can link to the project it is about | |
| Empty and error states | Designed for Home, Projects, Blog, 404 and 500 | |
| Link previews | Site and post preview images (with my grayscale photo), favicon, sitemap | |
| Admin screens | Designed (login and its states, posts, projects, tags, editors, dialogs, toasts, upload) | Not designed yet |
| Image uploads | JPEG, PNG, WebP, GIF, AVIF; no SVG; 5 MB; covers are deleted from storage when replaced or when their content is deleted | |
| Blog pagination | 10 posts per page | |
| Tag filters | In the URL (`?tag=`), so they can be shared | |
| Section labels | None above the Projects and Blog titles | A "Portfolio" and a "Writing" label |
| Freshness | Public pages refresh within 60 seconds of a change | |
| Motion | Present and energetic on the public site: hover and focus, load, scroll reveal, page transitions, theme cross-fade; small transitions only in the admin | Calm, no entrances, no bounces or slides |
| Animation library | None: CSS, Svelte's built-ins and the browser's view transitions | A heavy library such as GSAP |

## 9. Open questions

Still open:

- Résumé file: still to provide. The Download résumé button stays hidden until `static/resume.pdf` exists.
- RSS feed: still not planned.
- Real projects and posts: to be written in the dashboard.

Settled since version 0.2:

- The admin screens, the login screen (default, signing in, denied, error, rate limited), the rate-limited (429) page and the denied-sign-in wording are designed and built.
- About me now has its real content, in the site's code.

Confirmed (applied in SOFTWARE.md):

- Add an optional `team` field to projects for the "Team" row in the facts card (for example "Solo" or "Team of 4").
- Add an optional link from a post to a project, for "The project this post is about".
- Keep the About me content in the site's code, not in the dashboard.
- Project pages use the site preview image; each post gets its own generated preview image.
