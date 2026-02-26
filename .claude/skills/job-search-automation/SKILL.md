---
name: job-search-automation
description: Complete specification for the LinkedIn Job Search Automation system using curious_coder/linkedin-jobs-search-scraper actor. Covers correct input schema with cookies+userAgent, CQRS architecture, domain events, and end-to-end workflows. CONFIRMED WORKING (Feb 2026).
---

# Job Search Automation — Confirmed Working Architecture

## What's Implemented ✅

1. **Apify Integration** - LinkedIn scraping with correct actor input schema
2. **Job Storage** - Database with proper deduplication and field mapping
3. **CQRS Architecture** - Commands, queries, and event handlers
4. **Domain Events** - Event-driven flow for future LLM integration
5. **Background Jobs** - BullMQ processing for long-running scrapes

## What's NOT Implemented ❌

1. **LLM Evaluation** - Job scoring against preferences
2. **User Preferences** - Criteria storage and management
3. **Scheduler** - Daily automated scraping
4. **Cover Letters** - LLM-powered generation
5. **Frontend** - React dashboard

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

**Cookie Export Steps:**

1. Install Cookie-Editor extension
2. Go to linkedin.com (logged in)
3. Export cookies as JSON
4. Update `ApifyService.LINKEDIN_COOKIES` array
5. Must refresh before each scrape (especially `__cf_bm`)

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

# Future LLM
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

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

## 6. Testing

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Push database schema
pnpm --filter @job-search/backend db:push

# 3. Start backend
pnpm --filter @job-search/backend dev

# 4. Trigger scrape (uses hardcoded URLs)
curl -X POST http://localhost:3000/apify/scrape \
  -H "Content-Type: application/json" \
  -d '{}'

# 5. Or with custom URL
curl -X POST http://localhost:3000/apify/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://linkedin.com/jobs/search?..."], "count":25}'

# 6. Check status
curl http://localhost:3000/apify/jobs/<jobId>

# 7. View in database
pnpm --filter @job-search/backend db:studio
```

---

## 7. Next Steps (Prioritized)

### Phase 1: LLM Evaluation ⚠️ CRITICAL

**Goal:** Score jobs against user preferences, only save relevant ones

**Tasks:**

1. Create `UserPreference` model (criteria, resume, minScore)
2. Create preferences CRUD endpoints
3. Implement `LlmEvaluationService` (Anthropic SDK)
4. Create `EvaluateScrapedJobsHandler` (subscribes to `JobsScrapedEvent`)
5. Update `Job` model to store LLM scores
6. Add deduplication check (skip if jobId already exists)

**Estimated time:** 2-3 days

### Phase 2: Scheduler

**Goal:** Daily automated scraping at 9 AM

**Tasks:**

1. Create `scheduler` module with `@nestjs/schedule`
2. Add `@Cron('0 9 * * *')` decorator
3. Query active SearchConfigs (or use hardcoded URLs)
4. Enqueue scrape jobs

**Estimated time:** 1 day

### Phase 3: Frontend Dashboard

**Goal:** View jobs, mark as applied, generate cover letters

**Tasks:**

1. React + TanStack Router + Query setup
2. Jobs list page with filters/sorting
3. Job detail page
4. Status update UI
5. Cover letter generation

**Estimated time:** 3-5 days

---

## 8. Cost Estimation

**Apify:** $30/month subscription + ~$5/month usage = $35/month
**LLM (future):** ~$5/month for evaluation = $5/month
**Total:** ~$40/month

---

## 9. Known Issues

1. **Cookies expire** - `__cf_bm` expires every 30 minutes, need manual refresh
   - Future: Implement cookie refresh mechanism

2. **No filtering** - All scraped jobs saved regardless of relevance
   - Solution: Implement LLM evaluation (Phase 1)

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
