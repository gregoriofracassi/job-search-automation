# LinkedIn Job Search Automation

**Simple, automated job search with AI-powered scoring.**

Scrape LinkedIn jobs, filter by keywords, score with LLM (Gemini 2.5 Flash), and save the best matches to your database.

## What It Does

1. **Scrapes** jobs from LinkedIn via Apify actor
2. **Filters** out unwanted jobs (PHP, Python, Java, etc.)
3. **Scores** remaining jobs 0-100 with LLM based on your preferences
4. **Saves** high-scoring jobs (≥70) to PostgreSQL

## Quick Start

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL + Redis)
- LinkedIn account (for cookies)
- OpenRouter API key ([get one here](https://openrouter.ai/))

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env and add:
#   - OPENROUTER_API_KEY
#   - APIFY_API_KEY

# 4. Push database schema
pnpm --filter @job-search/backend db:push

# 5. Seed default preferences
npx ts-node -r tsconfig-paths/register apps/backend/src/modules/llm-evaluation/seed-preferences.ts
```

### Update LinkedIn Cookies (Required Before Each Scrape)

LinkedIn cookies expire every 30 minutes, so you need to refresh them before scraping:

1. Install [Cookie-Editor](https://cookie-editor.com/) browser extension
2. Go to linkedin.com (logged in)
3. Click Cookie-Editor → Export → Copy as JSON
4. Open `apps/backend/src/modules/apify/apify.service.ts`
5. Replace the `LINKEDIN_COOKIES` array
6. Save and restart the server

### Configure Search URLs

Edit `apps/backend/src/modules/apify/linkedin-search-urls.config.ts` with your desired LinkedIn search URLs.

### Run

```bash
# Start backend
pnpm --filter @job-search/backend dev

# Trigger scrape (uses configured URLs, unlimited results)
curl -X POST http://localhost:3000/api/apify/scrape \
  -H "Content-Type: application/json" \
  -d '{}'

# Monitor logs for progress
# View results in database
pnpm --filter @job-search/backend db:studio
```

## Customizing Preferences

Edit preferences directly in the database:

```sql
UPDATE "UserPreference"
SET
  "systemPrompt" = 'You are an expert job evaluator. Score jobs based on...',
  "scoringCriteria" = ARRAY['Remote work', 'TypeScript', 'Startup culture'],
  "excludedKeywords" = ARRAY['php', 'python', 'java ', 'ruby'],
  "minScoreThreshold" = 75
WHERE "isDefault" = true;
```

## Architecture

- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ + Redis
- **Scraper:** Apify (curious_coder/linkedin-jobs-search-scraper)
- **LLM:** Google Gemini 2.5 Flash via OpenRouter
- **Pattern:** CQRS + DDD + Event-Driven

## Cost

- **Apify:** $30/month + ~$0.003/job
- **Gemini 2.5 Flash:** ~$0.0006/job
- **Total:** ~$0.0036/job (~$36-37/month for 100 jobs/day)

## Limitations

- **Manual cookie updates** (every 30 minutes)
- **No UI** (database access via Prisma Studio)
- **Single user** (no authentication)
- **Manual triggering** (no scheduler)

## Documentation

See `.claude/skills/job-search-automation/SKILL.md` for complete technical documentation.

## License

MIT
