---
name: job-search-automation
description: Complete specification for the LinkedIn Job Search Automation system using curious_coder/linkedin-jobs-search-scraper actor. Covers correct input schema with cookies+userAgent, CQRS architecture, domain events, and end-to-end workflows. CONFIRMED WORKING (Feb 2026).
---

# Job Search Automation — MVP Scope

## Current Scope 🎯 (March 2026)

**Simple, manual job search workflow:**

1. Manually update LinkedIn cookies in code
2. Scrape 3-4 different LinkedIn search URLs (unlimited results)
3. Filter out unwanted jobs by excluded keywords
4. Score jobs with LLM (Gemini 2.5 Flash) based on preferences
5. Save scored jobs in database

**Out of scope (for now):**

- ❌ Frontend dashboard
- ❌ Settings UI (preferences stored in DB, managed manually)
- ❌ Automated scheduling
- ❌ Cover letter generation
- ❌ Cookie auto-refresh

## What's Implemented ✅

1. **Apify Integration** - LinkedIn scraping with manual cookie updates
2. **Job Storage** - Database with deduplication by LinkedIn job ID
3. **CQRS Architecture** - Commands, queries, and event handlers
4. **LLM Evaluation** - Keyword filtering + Gemini 2.5 Flash scoring
5. **Background Jobs** - BullMQ for async scraping
6. **User Preferences** - Database storage (manual editing for now)

---

## 1. Apify Integration ✅ WORKING

### Actor: `curious_coder/linkedin-jobs-search-scraper`

- **Cost:** $30/month + $0.003 per result
- **Success Rate:** >98%
- **Requires:** LinkedIn cookies (auth) + user agent

### Correct Input Schema

```typescript
interface LinkedinScrapeInput {
  searchUrl: string; // SINGLE URL per actor run (REQUIRED)
  cookies: LinkedinCookie[]; // LinkedIn auth cookies (REQUIRED)
  userAgent: string; // User agent string (REQUIRED - prevents cookie errors!)
  proxy: {
    useApifyProxy: boolean; // REQUIRED
    apifyProxyCountry?: string; // e.g., "US"
  };
  count?: number; // Number of jobs to scrape (optional, scrapes all if omitted)
  scrapeJobDetails?: boolean; // Extra details (slower, default: false)
  scrapeSkills?: boolean; // Skills data (slower, default: false)
  scrapeCompany?: boolean; // Company data (slower, default: false)
}
```

### Critical Cookies (Must Export Fresh!)

```typescript
LINKEDIN_COOKIES = [
  { name: 'li_at', value: '...', ... },      // Auth token (long-lived)
  { name: 'JSESSIONID', value: '...', ... }, // Session ID
  { name: 'bcookie', value: '...', ... },    // Browser cookie
  { name: 'lidc', value: '...', ... },       // Data center routing
  { name: '__cf_bm', value: '...', ... },    // ⚠️ EXPIRES EVERY 30 MINUTES!
];
```

**Cookie Update Process (Manual - Required Before Each Scrape):**

1. Install [Cookie-Editor](https://cookie-editor.com/) browser extension
2. Go to linkedin.com (ensure you're logged in)
3. Click Cookie-Editor → Export → Copy as JSON
4. Open `apps/backend/src/modules/apify/apify.service.ts`
5. Replace the `LINKEDIN_COOKIES` array with your exported cookies
6. Save the file
7. Restart the backend server

**⚠️ Important:** `__cf_bm` cookie expires every 30 minutes, so you need fresh cookies before scraping!

### Output Format

```typescript
interface LinkedinJobResponseDto {
  id: number; // LinkedIn job ID
  title: string;
  companyName: string;
  companyLinkedinUrl: string;
  location: string;
  link: string; // Job URL
  descriptionText: string; // ⭐ Main field for LLM evaluation
  formattedDescription?: string; // HTML version
  postedAt: string; // ISO date
  applies?: number;
  easyApply: boolean;
  employmentStatus?: string; // "Full-time", "Contract", etc.
  formattedExperienceLevel?: string;
  // ... more fields
}
```

---

## 2. Architecture ✅ CONFIRMED

### Flow

```
POST /apify/scrape { urls?, count?, ... }
  ↓
ScrapeLinkedinJobsCommand → BullMQ
  ↓
Return { jobId, status: 'queued' } immediately
  ↓
[Background] ApifyProcessor
  ↓
For each URL:
  1. Call ApifyService.runAndCollect(searchUrl, count, ...)
  2. Actor runs 60-180 seconds with cookies+userAgent
  3. Fetch results from dataset
  ↓
SaveScrapedJobsCommand
  ↓
  - Maps actor output → Job domain model
  - Upserts to database (dedup by jobId)
  - Returns job IDs
  ↓
JobsScrapedEvent published
  ↓
[Future] LLM evaluation handler will subscribe here
```

### Files

```
apps/backend/src/modules/
├── apify/
│   ├── apify.service.ts              // Actor API client with cookies
│   ├── apify.processor.ts            // BullMQ worker
│   ├── linkedin-search-urls.config.ts // Hardcoded URLs
│   └── dto/
│       ├── requests/scrape-linkedin-jobs.request.dto.ts
│       └── responses/linkedin-job.response.dto.ts
│
├── jobs/
│   ├── domain/
│   │   ├── models/job.model.ts       // Aggregate root
│   │   ├── repositories/job.repository.ts // Only Prisma access
│   │   └── events/
│   │       ├── jobs-scraped.event.ts
│   │       ├── job-evaluated.event.ts
│   │       └── handlers/... (placeholders)
│   └── commands/
│       ├── impl/save-scraped-jobs.command.ts
│       └── handlers/save-scraped-jobs.handler.ts // Maps actor output
```

### Database Schema

```prisma
model Job {
  id String @id @default(uuid())

  // Deduplication key
  jobId      String  @unique  // Actor's numeric ID (converted to string)
  jobUrl     String           // link field
  applyUrl   String?
  easyApply  Boolean

  // Job details
  jobTitle       String
  companyName    String
  companyUrl     String?       // companyLinkedinUrl
  companyLogoUrl String?
  location       String
  seniorityLevel String?       // formattedExperienceLevel
  employmentType String?       // employmentStatus
  jobFunction    String?       // formattedJobFunctions (joined)
  industries     String?       // formattedIndustries (joined)

  // Content (for LLM)
  jobDescription     String @db.Text  // descriptionText
  jobDescriptionHtml String @db.Text

  // Metadata
  timePosted    String?  // postedAt
  numApplicants String?  // applies
  scrapedAt     DateTime @default(now())

  // LLM evaluation (null until scored)
  score          Int?
  scoreReasoning String? @db.Text
  scoreCriteria  Json?
  scoredAt       DateTime?

  // Application tracking
  status    JobStatus @default(NEW)
  appliedAt DateTime?
  notes     String?   @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum JobStatus {
  NEW
  EVALUATED
  SAVED
  APPLIED
  INTERVIEWING
  OFFERED
  REJECTED
  WITHDRAWN
}
```

---

## 3. CQRS & DDD Compliance ✅

### Commands

- `ScrapeLinkedinJobsCommand` → Enqueues BullMQ job
- `SaveScrapedJobsCommand` → Persists jobs to DB
- `UpdateJobStatusCommand` → Changes job status

### Queries

- `GetScrapeJobResultsQuery` → Polls BullMQ job status
- `ListJobsQuery` → (Future) List jobs with filters

### Events

- `JobsScrapedEvent` → Fired after scraping + saving
- `JobEvaluatedEvent` → (Future) Fired after LLM scoring
- `JobStatusChangedEvent` → Fired on status transitions

### Domain Model

```typescript
export class Job extends AggregateRoot {
  #props: JobProps;

  markApplied(): void {
    if (this.#props.status !== JobStatus.NEW) {
      throw new InvalidStatusTransitionException(...);
    }
    this.#props.status = JobStatus.APPLIED;
    this.#props.appliedAt = new Date();
  }
}
```

### Repository Pattern

- Only `JobRepository` injects `PrismaService`
- Mapper functions: `mapPrismaJobToDomain()`, `mapDomainJobToPrisma()`
- All queries return domain models

---

## 4. API Endpoints

```
POST /apify/scrape
  Body: {
    urls?: string[],              // Optional (uses hardcoded if not provided)
    count?: number,               // Optional (scrapes all if not provided)
    scrapeJobDetails?: boolean,   // Default: false
    scrapeSkills?: boolean,       // Default: false
    scrapeCompany?: boolean       // Default: false
  }
  Response: { jobId: string, status: 'queued' }

GET /apify/jobs/:jobId
  Response: {
    status: 'queued' | 'active' | 'completed' | 'failed',
    results?: LinkedinJobResponseDto[]
  }
```

---

## 5. Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/job_search
REDIS_URL=redis://localhost:6381
APIFY_API_KEY=apify_api_...

# LLM (OpenRouter)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
# Using google/gemini-2.5-flash: fast, cheap ($0.0006/job), built for reasoning

# Future scheduler
DAILY_SCRAPE_CRON=0 9 * * *

NODE_ENV=development
PORT=3000
```

### Hardcoded URLs (for now)

```typescript
// apps/backend/src/modules/apify/linkedin-search-urls.config.ts
export const LINKEDIN_SEARCH_URLS = [
  'https://www.linkedin.com/jobs/search/?f_WT=2&keywords=backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',
  // Add more...
];
```

---

## 6. Complete Workflow (MVP)

### Prerequisites

1. **Update LinkedIn Cookies** (see section 1 above)
2. **Update Search URLs** in `apps/backend/src/modules/apify/linkedin-search-urls.config.ts`
3. **Customize Preferences** (optional) - Update the database directly:

```sql
-- Update scoring criteria and excluded keywords
UPDATE "UserPreference"
SET
  "systemPrompt" = 'Your custom evaluation instructions...',
  "scoringCriteria" = ARRAY['Remote work', 'TypeScript', 'Startup culture'],
  "excludedKeywords" = ARRAY['php', 'python', 'java ', 'ruby'],
  "minScoreThreshold" = 75
WHERE "isDefault" = true;
```

### Running the System

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Ensure latest schema
pnpm --filter @job-search/backend db:push

# 3. Seed default preferences (if not done yet)
npx ts-node -r tsconfig-paths/register src/modules/llm-evaluation/seed-preferences.ts

# 4. Start backend
pnpm --filter @job-search/backend dev

# 5. Trigger scrape (unlimited results from hardcoded URLs)
curl -X POST http://localhost:3000/api/apify/scrape \
  -H "Content-Type: application/json" \
  -d '{}'

# 6. Monitor logs for:
#    - Job scraping progress
#    - Keyword filtering (jobs skipped)
#    - LLM evaluation (jobs scored)
#    - Final counts

# 7. View scored jobs in database
pnpm --filter @job-search/backend db:studio
# Look for jobs with score >= 70 and status = EVALUATED
```

### What Happens

1. **Scraper runs** → Fetches jobs from 3-4 LinkedIn URLs (unlimited results)
2. **Jobs saved** → Deduplicated by LinkedIn job ID
3. **Keyword filter** → Jobs with PHP/Python/Java are skipped (saves LLM costs)
4. **LLM scoring** → Remaining jobs scored 0-100 by Gemini 2.5 Flash
5. **Status update** → Jobs with score ≥ 70 marked as EVALUATED
6. **Database** → All jobs stored with scores and reasoning

---

## 7. Future Enhancements (Out of Current Scope)

### Potential Improvements (Not Planned)

1. **Cookie Auto-Refresh** - Automatically refresh LinkedIn cookies
2. **Automated Scheduling** - Daily scrapes at specific times
3. **Frontend Dashboard** - View and manage jobs via UI
4. **Settings UI** - Manage preferences without SQL
5. **Cover Letter Generation** - LLM-powered personalized cover letters
6. **Multi-User Support** - User authentication and isolation

**Current approach:** Keep it simple, manual, and focused on core value (finding good jobs)

---

## 8. Cost Estimation

**Apify:** $30/month subscription + ~$5/month usage = $35/month
**LLM (Gemini 2.5 Flash via OpenRouter):**

- ~100 jobs/day × $0.0006/job = $0.06/day = $1.80/month
- With aggressive keyword filtering: ~$1/month
  **Total:** ~$36-37/month

**Cost comparison:**

- Claude 3.5 Sonnet would be ~$54/month (15x more expensive!)
- Gemini 2.5 Flash: 5x faster, 25x cheaper, built for structured reasoning

---

## 9. Known Issues & Future Improvements

1. **Cookies expire** - `__cf_bm` expires every 30 minutes, need manual refresh
   - Future: Implement cookie refresh mechanism

2. **Sequential LLM evaluation** - Jobs are evaluated one at a time (slow for large batches)
   - Current: ~2 seconds per job, ~10 minutes for 250 jobs
   - **Future improvement: Implement concurrent evaluation**
   - OpenRouter allows up to 500 RPS for paid models, no risk of overwhelming
   - Implementation approach:
     ```typescript
     // In jobs-scraped.handler.ts, replace the for loop with:
     const BATCH_SIZE = 10; // Process 10 jobs concurrently
     for (let i = 0; i < event.jobIds.length; i += BATCH_SIZE) {
       const batch = event.jobIds.slice(i, i + BATCH_SIZE);
       await Promise.all(
         batch.map(async (jobId) => {
           // existing evaluation logic here
         }),
       );
     }
     ```
   - Expected speedup: 10x faster (250 jobs in ~1-2 minutes instead of 10)

3. **No automation** - Must manually trigger scrapes
   - Solution: Implement scheduler (Phase 2)

4. **Hardcoded URLs** - URLs in config file, not database
   - Solution: Create SearchConfig CRUD (future)

---

## 10. Golden Rules

1. ✅ **userAgent is REQUIRED** - Prevents "cookies expired" errors
2. ✅ **Single URL per actor run** - Use `searchUrl`, not `urls` array
3. ✅ **Fresh cookies before scraping** - Especially `__cf_bm` (30 min expiry)
4. ✅ **Deduplication by jobId** - Upsert prevents duplicates
5. ✅ **Event-driven flow** - Scraping → Event → Evaluation → Event → Save
6. ✅ **Repository pattern** - Only repositories touch Prisma

---

## Summary

**Working:**

- ✅ Correct actor input schema (searchUrl + cookies + userAgent)
- ✅ Job scraping with proper field mapping
- ✅ CQRS architecture (commands, queries, events)
- ✅ Repository pattern with domain models
- ✅ Background jobs with BullMQ
- ✅ Deduplication by LinkedIn job ID
- ✅ Event infrastructure for future LLM integration

**Missing:**

- ❌ LLM evaluation and scoring
- ❌ User preferences management
- ❌ Scheduled daily scraping
- ❌ Cover letter generation
- ❌ Frontend dashboard

**Next:** Implement LLM evaluation (Phase 1) to filter jobs by relevance.
