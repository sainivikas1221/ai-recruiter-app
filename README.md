# JobPilot (AI Recruiter App)

Job seekers sign in, upload a resume, and the AI suggests what they're looking for: roles, job type,
remote/hybrid/onsite, locations and salary. They confirm or edit it, and the app searches public job
sources and ranks every match with the reasons it matched.

This is **Phase 1**: sign in, resume upload, AI-extracted preferences, job search and ranked results.
Applying (one-click and auto-apply with approval) comes in Phase 2.

## Where jobs come from

Only sources that publish jobs for other apps to read. Sites whose terms ban automation (LinkedIn,
Indeed, Naukri, Glassdoor) are deliberately not used.

| Source | What it is | Key needed |
| --- | --- | --- |
| Greenhouse, Lever, Ashby | Public job board APIs of company career pages (list in `src/lib/jobs/boards.ts`) | No |
| Remotive | Remote jobs API | No |
| Arbeitnow | Job board API, mostly Europe | No |
| Adzuna | Aggregator API in ~20 countries | Yes (free) |

Each feed is cached for 6 hours in Postgres. A feed that fails is skipped and retried on the next search.

## Ranking

`src/lib/jobs/rank.ts` scores each job 0–100: title vs target roles (45), skills mentioned (25),
location and work mode (15), salary vs expectations (10) and recency (5). Jobs that clearly don't fit
(unrelated title, an office in a city the user didn't pick, the wrong employment type) are left out,
and the same role listed on two sources is shown once.

## Running locally

```bash
npm install
npm run setup     # asks for a Postgres connection string, writes .env.local, creates the tables
npm run dev       # http://localhost:3000
```

Any Postgres works: a free hosted one (for example Neon), or `docker compose up -d` for one on
localhost:5432 (`postgres://app:app@localhost:5432/recruiter`). To fill `.env.local` by hand
instead, copy `.env.example` and run `npm run db:migrate`.

Without `ANTHROPIC_API_KEY` the app reads resumes with a simple keyword matcher, so the whole flow
works offline. With a key, Claude does the extraction.

```bash
npm test          # unit tests
npm run lint
npm run typecheck
```

## Stack

Next.js (App Router, Server Actions), Postgres with Drizzle ORM, iron-session cookies with email +
password and optional Google sign-in, Claude via the Anthropic SDK, `unpdf` and `mammoth` for reading
resumes. Only the resume's text is stored, not the file.
