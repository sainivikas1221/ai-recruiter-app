# JobPilot (AI Recruiter App)

Job seekers sign in, upload a resume, and the AI suggests what they're looking for: roles, job type,
remote/hybrid/onsite, locations and salary. They confirm or edit it, and the app searches public job
sources and ranks every match with the reasons it matched.

This is **Phase 1**: sign in, resume upload, AI-extracted preferences, job search and ranked results.
Applying (one-click and auto-apply with approval) comes in Phase 2.

## Where jobs come from

Only sources that publish jobs for other apps to read. JobPilot never reads or applies on sites whose
terms ban automation (LinkedIn, Indeed, Naukri, Shine, Glassdoor). Instead the jobs page has
"Search on more job sites" links that open those sites' own search, filled in with the user's role and
city, so they can apply there (`src/lib/jobs/elsewhere.ts`).

| Source | What it is | Key needed |
| --- | --- | --- |
| Greenhouse, Lever, Ashby | Public job board APIs of company career pages (list in `src/lib/jobs/boards.ts`) | No |
| Remotive | Remote jobs API | No |
| Himalayas | Remote jobs API | No |
| Jobicy | Remote jobs API | No |
| Arbeitnow | Job board API, mostly Europe | No |
| Adzuna | Aggregator API in ~20 countries, India included | Yes (free) |
| Jooble | Aggregator API in ~70 countries, India included | Yes (free) |
| JSearch | Google for Jobs results: what Google finds on Naukri, LinkedIn, Indeed, company sites | Yes (free plan) |

Each search uses the user's roles plus other common titles for the same work, e.g. "Visual Designer"
and "Creative Designer" for "Graphic Designer" (`src/lib/jobs/roles.ts`).

Each feed is cached for 6 hours in Postgres (JSearch for 24 hours, to stay in its free allowance). A feed that fails is skipped and retried on the next search.

## Ranking

`src/lib/jobs/rank.ts` scores each job 0–100: title vs target roles (45), skills mentioned (25),
location and work mode (15), salary vs expectations (10) and recency (5). Jobs that clearly don't fit
(unrelated title, an office in a city the user didn't pick, the wrong employment type) are left out,
and the same role listed on two sources is shown once.

## Running locally

**The easy way:** double-click `Start JobPilot.bat` (Windows) or `Start JobPilot.command` (Mac).
It installs Node.js if needed (Windows), downloads dependencies and builds the app the first time,
then opens it in your browser. Nothing else to set up: without `DATABASE_URL` the app runs Postgres
inside itself ([PGlite](https://pglite.dev)) and keeps the data in `~/.jobpilot`, so a fresh download
keeps your accounts. The first start asks once for an optional Anthropic API key. Job search keys
(`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JOOBLE_API_KEY`, `JSEARCH_API_KEY`) go in `~/.jobpilot/keys.env`,
one `NAME=value` per line, and are kept across new downloads.

**As a developer:**

```bash
npm install
npm run dev       # http://localhost:3000, built-in database
```

To use a real Postgres instead (any provider, or `docker compose up -d`), run `npm run setup` once, or
set `DATABASE_URL` in `.env.local`. Tables are created automatically when the server starts.
`SESSION_SECRET` is optional: without it the app derives one from `DATABASE_URL`, or generates one
next to the built-in database. Without `ANTHROPIC_API_KEY` the app reads resumes with a simple
keyword matcher.

## Hosting online (Hostinger)

Hostinger's **Business** and **Cloud** web hosting plans run Next.js apps (hPanel → Websites →
Add website → Node.js web app). Upload `JobPilot-hostinger.zip` (or connect this repository), keep
the detected Next.js settings (Node 22, `npm run build`, output `.next`) and set one environment
variable: `DATABASE_URL`, a Postgres connection string such as a free [Neon](https://neon.tech)
database. Hostinger has no Postgres of its own on these plans. The tables are created when the app
starts. Add `ANTHROPIC_API_KEY` to have Claude read resumes.

```bash
npm test          # unit tests
npm run lint
npm run typecheck
```

## Stack

Next.js (App Router, Server Actions), Postgres with Drizzle ORM, iron-session cookies with email +
password and optional Google sign-in, Claude via the Anthropic SDK, `unpdf` and `mammoth` for reading
resumes. Only the resume's text is stored, not the file.
