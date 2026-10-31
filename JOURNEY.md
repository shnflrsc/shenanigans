# Shenanigans: User Journey Map

Version 0.2 · 2026-10-31 · Companion to PRODUCT.md and SOFTWARE.md. Updated for the public-page designs.

## 0. How to read this

- **Software type:** web app with a public site (Home, Projects, Blog) and a private admin dashboard.
- **Evidence:** none yet. The site is unbuilt and there is no user research. Everything below is a hypothesis based on the audiences in PRODUCT.md. Feelings and durations are assumptions to check with real people (see section 8).
- **"Current state"** means how the person does the job today without Shenanigans.
- **"Desired state"** means the journey once the site works as specified, and where the spec still leaves a gap.
- **Journeys:** A) a recruiter deciding whether to get in touch, B) a developer or learner reading a post, C) the owner publishing, D) failure and edge paths.

---

## 1. Journey A: Recruiter or employer

**Job:** When I have a candidate's name on an application, I want to quickly judge what they have built and how they work, so I can decide whether to contact them.
**Trigger:** A link on a CV, a LinkedIn profile or an application form.

### 1.1 Current state (assumed)

| Phase | Action | Touchpoint | Thinking | Feeling | Pain points | Duration |
|---|---|---|---|---|---|---|
| Awareness | Clicks the link on the CV | CV, LinkedIn | "Let's see if there's anything real here." | Neutral | Link often goes to a bare profile | seconds |
| Evaluation | Opens GitHub repos | GitHub | "Which of these matters? Did they build this alone?" | Confused | Code without context; no role, audience or outcome; READMEs vary | 2-5 min |
| Decision | Decides on a gut feeling | | "I can't tell what they actually did." | Anxious | Little evidence either way | 1 min |
| Contact | Finds an email on the CV | CV | | Neutral | | 1 min |

### 1.2 Desired state

| Phase | Action | Touchpoint | Thinking | Feeling | Design opportunity | Check |
|---|---|---|---|---|---|---|
| Arrive | Lands on Home | Home hero | "Who is this and what do they do?" | Curious | Headline, subtitle, photo with name and caption, and the buttons View projects and Read the blog (FR-1) | 5-second test |
| Learn about me | Scrolls to About me | Home, About me | "Who is this person, and are they at the level we need?" | Interested | Catchphrase, bio, quick facts, skills, experience, résumé download (FR-23). This replaces the dropped About page (gap G6) | Can a stranger say who you are, where you study and what you are open to? |
| Skim | Looks at the featured project | Home, Featured | "Is any of this relevant to us?" | Interested | The one featured project (FR-24, FR-16); the full list is one click away on Projects | Can a stranger name what the featured project is? |
| Deep dive | Opens one case study | Project page | "What did they do, and is it good?" | Confident | Facts card (year, role, team, links) and the case-study body (FR-27) | Can a stranger say what the person did? |
| Decide and contact | Clicks Get in touch, email, GitHub or LinkedIn | Header, contact box, footer | "I'll reach out." | Decisive | Get in touch in the header, a contact box on Home and case studies, and footer links (FR-6, FR-25, FR-26) | Contact found in under 10 seconds |
| Share | Forwards the link to a colleague | Link preview | "Take a look at this." | Satisfied | Page title, description and preview image (FR-31, FR-32) | Link pasted into chat shows a sensible preview |

**Duration target (assumed):** under 3 minutes from arrival to a contact decision.

---

## 2. Journey B: Developer or learner

**Job:** When I hit a problem or want to learn something, I want a clear, trustworthy write-up, so I can solve it and maybe learn more from the same author.
**Trigger:** A search result or a link shared in a chat or social post.

### 2.1 Current state (assumed)

| Phase | Action | Touchpoint | Thinking | Feeling | Pain points | Duration |
|---|---|---|---|---|---|---|
| Awareness | Searches the problem | Search engine | | Frustrated | Many near-duplicate results | 1 min |
| Evaluation | Opens a few results | Various blogs | "Is this current? Is it for my case?" | Skeptical | Outdated posts, no context, cluttered pages | 2-3 min |
| Core use | Reads and copies code | One post | | Neutral | Hard-to-read code blocks, no explanation of why | 5-10 min |
| Return | Forgets the source | | | Neutral | No easy way to find the author again | |

### 2.2 Desired state

| Phase | Action | Touchpoint | Thinking | Feeling | Design opportunity | Check |
|---|---|---|---|---|---|---|
| Arrive | Lands directly on a post | Post page | "Does this answer my question?" | Hopeful | Excerpt as page description; title and read time up top (FR-3, FR-31) | Excerpt alone tells you if it is relevant |
| Read | Reads at a comfortable width | Post body | "This is clear." | Focused | 680px reading width, readable prose styles | Reads well on a phone |
| Use code | Reads and copies code | Code blocks, alerts | "Good, the warning explains the catch." | Confident | Highlighted code with a language label and a Copy button, GitHub-style alerts (FR-5, UR-6, UR-7, UR-9) | Code legible in light and dark; Copy puts exactly the code on the clipboard |
| Orient | Checks tags, read time, date | Post header | "Is this recent?" | Informed | Published date, tags (3.2) | Date and tags visible without scrolling |
| Continue | Opens a related project or another post | Tag filters, project links | "What else has this person written?" | Curious | Tag filter chips with counts; "The project this post is about" and previous and next posts at the end of a post (FR-28) | Can reach the blog index in one click |
| Return | Comes back later | Bookmark | "I'll check for new posts." | Neutral | **No follow mechanism today** (see gap G1) | |

**Duration target (assumed):** under 10 seconds to judge relevance, then reading time.

---

## 3. Journey C: The owner publishes

**Job:** When I have finished a piece of work or a guide, I want to publish it with little effort, so I can share it.
**Trigger:** A finished project or a draft ready to go.

### 3.1 Current state

There is no process yet. This is the first version of the workflow.

### 3.2 Desired state

| Phase | Action | Touchpoint | Thinking | Feeling | Design opportunity | Check |
|---|---|---|---|---|---|---|
| Reach admin | Types /admin by hand | Browser address bar | "Which URL was it again?" | Neutral | By design there is no link (FR-8); bookmark it | |
| Sign in | Chooses GitHub sign-in | Login screen, GitHub | "Quick, please." | Neutral | One button, GitHub only (FR-9) | Signed in within 30 seconds |
| Choose | Opens a post or starts a new one | Dashboard | | Neutral | Clear posts and projects lists (FR-11, FR-15) | |
| Write | Writes markdown with live preview, sets excerpt, tags, cover | Editor | "Does it look right?" | Absorbed | Preview matches the public page (FR-12, SR-13); inline tags (FR-18); image upload (FR-13); project selector for "the project this post is about" (FR-33) | Preview and live page look the same |
| Publish | Switches status to published | Editor | "Done." | Satisfied | Publish and unpublish (FR-11) | |
| Verify | Opens the public page | Public post page | "Is it live?" | Reassured | Changes show within 60 seconds, ideally immediately (PR-6, gap G3) | New post visible within a minute of publishing |
| Fix | Corrects a typo | Editor | "Quick fix." | Neutral | Edit and republish; slug stays locked (FR-19) | |

**Add a project** follows the same path using the project editor (FR-15), plus the featured flag and order controls (FR-16, FR-17).

---

## 4. Journey D: Failure and edge paths

| Situation | What the person does | What happens (spec) | Feeling | Gap |
|---|---|---|---|---|
| Someone else tries to sign in at /admin | Signs in with another GitHub account | Signed out and denied (FR-10) | Confused | Message wording is unspecified |
| Owner retries login too often | Clicks sign-in repeatedly | HTTP 429 with a plain message after 10 requests in 10 minutes (SR-14) | Frustrated | Owner could lock themselves out for a short while |
| Visitor opens a link to an unpublished or deleted page | Follows an old link | Real 404 status and a friendly page with ways back (FR-4, FR-30) | Mildly disappointed | Resolved (G4) |
| Launch with one project and one post | Visits Home, Projects, Blog | Designed empty and launch states (FR-29) | Reassured | Resolved (G4) |
| The server hits an unexpected error | Loads any page | 500 page with Try again, Go home and an email link; no technical details (FR-30) | Annoyed, not lost | Resolved (G4) |
| Visitor on a phone | Opens the menu | Menu panel with Home, Projects, Blog and Get in touch; closes on Escape or link tap (FR-25) | Comfortable | Good as specified |
| Résumé file not provided yet | Looks for Download résumé | Button hidden until the file exists (FR-23) | Neutral | Résumé still to come (G9) |
| Owner loses connection or session while writing | Keeps typing, then saves | Save fails, typed content stays on screen with an error (FR-22); leaving with unsaved changes triggers a warning (FR-21) | Annoyed, not angry | Resolved (G2) |
| GitHub sign-in is down | Tries to log in | Cannot sign in | Stuck | Wait; acceptable for a solo site |
| Cover image missing or fails | Views a card | Muted placeholder (3.2) | Neutral | Good as specified |
| Visitor prefers dark mode | Opens site at night | Matches system setting, no flash (UR-3) | Comfortable | Good as specified |

---

## 5. Moments of truth

**Make or break**
- **First screen of Home (A).** If a stranger cannot tell who you are and what you build in about five seconds, they leave.
- **About me on Home (A).** It is the only place a recruiter learns who you are, so it must be credible and quick to scan.
- **First screen of a case study (A).** It must say what the project is, who it is for, and what you did.
- **Landing on a post from search (B).** The title and excerpt decide whether they stay.
- **First publish and seeing it live (C).** If the page looks stale or wrong after publishing, trust in the dashboard drops.

**Peak pain points**
- Losing a long draft (C, G2).
- Publishing and not seeing the result (C, G3).
- No way for a happy reader to follow along (B, G1).

**Moments of delight to protect**
- Live preview matching the public page exactly.
- Light and dark themes that follow the system, with no flash.
- A calm, readable post page with clear code and callouts.

---

## 6. Gap analysis

| ID | Phase | Gap versus the current spec | Suggested change | Priority |
|---|---|---|---|---|
| G1 | B: Return | Returning readers cannot follow new posts. Newsletter is out of scope; an RSS feed is not in SOFTWARE.md. | Decide whether to add an RSS feed | Medium |
| G2 | C: Write | No draft protection. A refresh or accidental navigation could lose a long post. | **Decided:** warn before leaving with unsaved changes (FR-21), no autosave. A failed save keeps the typed content on screen (FR-22). Crash or power loss can still lose unsaved text. | High (resolved in SOFTWARE.md) |
| G3 | C: Verify | A short shared cache (PR-1) could keep a freshly published post from showing right away. | **Decided:** changes appear within 60 seconds; saving refreshes the affected pages on demand where possible, otherwise the short cache window plus a dashboard note (PR-6). | High (resolved in SOFTWARE.md) |
| G4 | D: Edge | 404, error, empty and single-item states were not specified. | **Decided:** designed and specified (FR-29, FR-30). Admin, login and 429 screens are still undesigned (G12). | Medium (resolved in SOFTWARE.md) |
| G5 | A: Share, B: Arrive | Page titles, descriptions, social preview images and a sitemap were not specified. | **Decided:** metadata, favicon, sitemap and two preview image designs (FR-31, FR-32). The approach for rendering post previews is still to choose (G11). | Medium (mostly resolved) |
| G6 | A: Evaluate | The About page was dropped, so "who is this person" had no home. | **Decided:** About me is a section on Home (FR-23). Check in the recruiter walk-through that it is enough. | Low to Medium (resolved in SOFTWARE.md) |
| G7 | C: Fix | A slug typo cannot be fixed after first publish (FR-19). | Accept, or allow a controlled slug change with a redirect | Low |
| G8 | D: Login | Denial and 429 messages are unspecified. | Write short, plain copy for both | Low |
| G9 | A: Learn about me | The résumé file does not exist yet; the Download résumé button is hidden until it does (FR-23). | Provide the file | Low |
| G10 | A: Learn about me | About me content lives in the site's code, so changing it means a redeploy. | Accept for now; move it into the dashboard later if it changes often | Low |
| G11 | A: Share, B: Arrive | The way per-post preview images are rendered and cached is not chosen (FR-32). | Choose when building | Low to Medium |
| G12 | C and D | Admin screens, the login screen and the 429 page are not designed yet. | Run the admin design prompt | Medium |

---

## 7. What this journey map does not cover

- Real users. Section 8 describes how to get some evidence.
- Analytics. The site deliberately collects none, so improvement relies on the checks below, not on usage data.

## 8. Validation plan (no analytics)

Run these with real people once there is a working version:
1. **5-second test.** Show Home for five seconds to 3 to 5 people; ask who this is and what they do.
2. **Recruiter walk-through.** Ask 2 to 3 people with hiring experience to find a project, say what you did on it, find how to contact you, and say what they learned about you from About me. Note where they hesitate, and whether About me is enough without a separate page.
3. **Developer walk-through.** Give 2 to 3 developers one post and ask them to explain the main takeaway and find another post.
4. **Owner dry run.** Publish a test post and project from scratch, including one deliberate refresh mid-edit and one typo fix.
5. **Device and theme sweep.** Check the three public pages and one post on a phone, in light and dark.
