# LLM Evaluation Implementation Plan

✅ **STATUS: FULLY IMPLEMENTED** (March 2026)

This document describes the LLM evaluation system for automatically scoring scraped LinkedIn jobs.

## MVP Scope

**What's included:**

- ✅ Keyword filtering (pre-filter unwanted jobs)
- ✅ LLM scoring with Gemini 2.5 Flash
- ✅ User preferences stored in database (edited via SQL, no UI)
- ✅ Automatic evaluation after each scrape
- ✅ Idempotent (won't re-score already-evaluated jobs)

**What's NOT included:**

- ❌ Preferences CRUD API/UI (edit database directly)
- ❌ Manual re-evaluation command (clear score in DB to re-trigger)
- ❌ Customizable system prompts per-user (single default preference)

**Model Choice:** Using **Google Gemini 2.5 Flash** (`google/gemini-2.5-flash`) via OpenRouter

- **Why:** Built for reasoning + structured outputs, 5x faster than Claude, 90% caching discount
- **Cost:** ~$0.0006/job (vs $0.015 with Claude 3.5 Sonnet = 25x cheaper!)
- **Speed:** ~250 tokens/sec (vs 50 for Claude = 5x faster)
- **Quality:** Specifically designed for advanced reasoning and structured JSON tasks

---

## Architecture Overview

```
JobsScrapedEvent (published by ApifyProcessor)
         ↓
JobsScrapedEvaluationHandler (new handler in llm-evaluation module)
         ↓
For each scraped job:
  1. KeywordFilterService.shouldFilter() → Skip if matches excluded keywords
  2. LlmEvaluationService.evaluateJob() → Call OpenRouter API for score
  3. Update job.score, scoreReasoning, scoreCriteria, scoredAt
  4. Publish JobEvaluatedEvent
```

**Key Design Decisions:**

- **Event-driven**: No controller needed - evaluation happens automatically
- **Two-stage filtering**: Keywords first (cheap), then LLM (expensive)
- **Decoupled**: Jobs module doesn't know about LLM evaluation
- **User preferences**: Stored in database for easy configuration

---

## Step 1: Update Database Schema

**File:** `apps/backend/src/database/schema.prisma`

**Action:** Add `UserPreference` model after the `Job` model

```prisma
// ─── LLM Evaluation module ───────────────────────────────────────────────────

model UserPreference {
  id String @id @default(uuid())

  // LLM evaluation config
  systemPrompt      String   @db.Text // Custom instructions for the LLM
  scoringCriteria   String[] // Array of criteria (e.g., ["Remote-first", "TypeScript stack"])
  excludedKeywords  String[] // Keywords to filter out (e.g., ["php", "python", "java "])
  minScoreThreshold Int      @default(70) // Minimum score to mark as EVALUATED

  // Model selection
  llmProvider String @default("openrouter") // "openrouter", "anthropic", "openai"
  llmModel    String @default("google/gemini-2.5-flash")

  // User association (for future multi-user support)
  userId String? // Nullable for now, will be userId when auth is implemented

  isDefault Boolean  @default(false) // Default preferences to use
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([isDefault])
}
```

**Test:**

```bash
# Generate Prisma client
pnpm --filter @job-search/backend db:generate

# Push schema to database
pnpm --filter @job-search/backend db:push

# Verify table created
pnpm --filter @job-search/backend db:studio
# → Check that UserPreference table exists with correct columns
```

**Success Criteria:** ✅ UserPreference table exists in database with all columns

---

## Step 2: Add Environment Variable for OpenRouter

**File:** `apps/backend/.env`

**Action:** Add OpenRouter API key (you mentioned you already added this)

```bash
# LLM Provider (for job evaluation and cover letter generation)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...  # Your OpenRouter API key

# Alternatively, if using Anthropic directly:
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...
```

**Test:**

```bash
# Verify environment variable is loaded
node -e "require('dotenv').config(); console.log(process.env.OPENROUTER_API_KEY)"
# → Should print your API key
```

**Success Criteria:** ✅ API key is accessible in Node.js environment

---

## Step 3: Create LLM Evaluation Module Structure

**Directory:** `apps/backend/src/modules/llm-evaluation/`

**Action:** Create the following empty files first:

```bash
mkdir -p apps/backend/src/modules/llm-evaluation/{domain/{models,repositories,services},commands/{impl,handlers},events/handlers,dto/{requests,responses},exceptions}

# Create placeholder files
touch apps/backend/src/modules/llm-evaluation/llm-evaluation.module.ts
touch apps/backend/src/modules/llm-evaluation/domain/models/user-preference.model.ts
touch apps/backend/src/modules/llm-evaluation/domain/repositories/user-preference.repository.ts
touch apps/backend/src/modules/llm-evaluation/domain/services/keyword-filter.service.ts
touch apps/backend/src/modules/llm-evaluation/domain/services/llm-evaluation.service.ts
touch apps/backend/src/modules/llm-evaluation/events/handlers/jobs-scraped.handler.ts
touch apps/backend/src/modules/llm-evaluation/exceptions/llm-api-error.exception.ts
touch apps/backend/src/modules/llm-evaluation/exceptions/keyword-filtered.exception.ts
```

**Test:**

```bash
# Verify directory structure
tree apps/backend/src/modules/llm-evaluation -L 3
```

**Success Criteria:** ✅ All directories and files created

---

## Step 4: Implement UserPreference Domain Model

**File:** `apps/backend/src/modules/llm-evaluation/domain/models/user-preference.model.ts`

**Code:**

```typescript
import { AggregateRoot } from '@nestjs/cqrs';

export interface UserPreferenceProps {
  id: string;
  systemPrompt: string;
  scoringCriteria: string[];
  excludedKeywords: string[];
  minScoreThreshold: number;
  llmProvider: string;
  llmModel: string;
  userId: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UserPreference aggregate root
 * Stores LLM evaluation configuration and scoring criteria
 */
export class UserPreference extends AggregateRoot {
  #props: UserPreferenceProps;

  constructor(props: UserPreferenceProps) {
    super();
    this.#props = props;
  }

  get id(): string {
    return this.#props.id;
  }

  get systemPrompt(): string {
    return this.#props.systemPrompt;
  }

  get scoringCriteria(): string[] {
    return this.#props.scoringCriteria;
  }

  get excludedKeywords(): string[] {
    return this.#props.excludedKeywords;
  }

  get minScoreThreshold(): number {
    return this.#props.minScoreThreshold;
  }

  get llmProvider(): string {
    return this.#props.llmProvider;
  }

  get llmModel(): string {
    return this.#props.llmModel;
  }

  get userId(): string | null {
    return this.#props.userId;
  }

  get isDefault(): boolean {
    return this.#props.isDefault;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  /**
   * Update evaluation configuration
   */
  updateConfiguration(
    systemPrompt?: string,
    scoringCriteria?: string[],
    excludedKeywords?: string[],
    minScoreThreshold?: number,
  ): void {
    if (systemPrompt !== undefined) this.#props.systemPrompt = systemPrompt;
    if (scoringCriteria !== undefined) this.#props.scoringCriteria = scoringCriteria;
    if (excludedKeywords !== undefined) this.#props.excludedKeywords = excludedKeywords;
    if (minScoreThreshold !== undefined) this.#props.minScoreThreshold = minScoreThreshold;
    this.#props.updatedAt = new Date();
  }

  /**
   * Update LLM provider settings
   */
  updateLlmSettings(provider: string, model: string): void {
    this.#props.llmProvider = provider;
    this.#props.llmModel = model;
    this.#props.updatedAt = new Date();
  }

  /**
   * Mark as default preference
   */
  markAsDefault(): void {
    this.#props.isDefault = true;
    this.#props.updatedAt = new Date();
  }

  /**
   * Unmark as default
   */
  unmarkAsDefault(): void {
    this.#props.isDefault = false;
    this.#props.updatedAt = new Date();
  }
}
```

**Test:** TypeScript compilation

```bash
pnpm --filter @job-search/backend typecheck
```

**Success Criteria:** ✅ No TypeScript errors

---

## Step 5: Implement UserPreference Repository

**File:** `apps/backend/src/modules/llm-evaluation/domain/repositories/user-preference.repository.ts`

**Code:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UserPreference } from '../models/user-preference.model';

@Injectable()
export class UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find the default user preference
   */
  async findDefault(): Promise<UserPreference | null> {
    const prismaPreference = await this.prisma.userPreference.findFirst({
      where: { isDefault: true },
    });

    if (!prismaPreference) return null;

    return new UserPreference({
      id: prismaPreference.id,
      systemPrompt: prismaPreference.systemPrompt,
      scoringCriteria: prismaPreference.scoringCriteria,
      excludedKeywords: prismaPreference.excludedKeywords,
      minScoreThreshold: prismaPreference.minScoreThreshold,
      llmProvider: prismaPreference.llmProvider,
      llmModel: prismaPreference.llmModel,
      userId: prismaPreference.userId,
      isDefault: prismaPreference.isDefault,
      createdAt: prismaPreference.createdAt,
      updatedAt: prismaPreference.updatedAt,
    });
  }

  /**
   * Find preference by ID
   */
  async findById(id: string): Promise<UserPreference | null> {
    const prismaPreference = await this.prisma.userPreference.findUnique({
      where: { id },
    });

    if (!prismaPreference) return null;

    return new UserPreference({
      id: prismaPreference.id,
      systemPrompt: prismaPreference.systemPrompt,
      scoringCriteria: prismaPreference.scoringCriteria,
      excludedKeywords: prismaPreference.excludedKeywords,
      minScoreThreshold: prismaPreference.minScoreThreshold,
      llmProvider: prismaPreference.llmProvider,
      llmModel: prismaPreference.llmModel,
      userId: prismaPreference.userId,
      isDefault: prismaPreference.isDefault,
      createdAt: prismaPreference.createdAt,
      updatedAt: prismaPreference.updatedAt,
    });
  }

  /**
   * Save (create or update) user preference
   */
  async save(preference: UserPreference): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { id: preference.id },
      create: {
        id: preference.id,
        systemPrompt: preference.systemPrompt,
        scoringCriteria: preference.scoringCriteria,
        excludedKeywords: preference.excludedKeywords,
        minScoreThreshold: preference.minScoreThreshold,
        llmProvider: preference.llmProvider,
        llmModel: preference.llmModel,
        userId: preference.userId,
        isDefault: preference.isDefault,
        createdAt: preference.createdAt,
        updatedAt: preference.updatedAt,
      },
      update: {
        systemPrompt: preference.systemPrompt,
        scoringCriteria: preference.scoringCriteria,
        excludedKeywords: preference.excludedKeywords,
        minScoreThreshold: preference.minScoreThreshold,
        llmProvider: preference.llmProvider,
        llmModel: preference.llmModel,
        isDefault: preference.isDefault,
        updatedAt: preference.updatedAt,
      },
    });
  }
}
```

**Test:** TypeScript compilation

```bash
pnpm --filter @job-search/backend typecheck
```

**Success Criteria:** ✅ No TypeScript errors

---

## Step 6: Implement KeywordFilterService

**File:** `apps/backend/src/modules/llm-evaluation/domain/services/keyword-filter.service.ts`

**Code:**

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface FilterResult {
  filtered: boolean;
  matchedKeywords: string[];
}

/**
 * Service for pre-filtering jobs by excluded keywords before LLM evaluation.
 * This reduces LLM API costs by skipping jobs that contain unwanted technologies.
 */
@Injectable()
export class KeywordFilterService {
  private readonly logger = new Logger(KeywordFilterService.name);

  /**
   * Check if job should be filtered out based on excluded keywords.
   *
   * Rules:
   * - Keywords with trailing space (e.g., "java ") require word boundary match
   * - Regular keywords use case-insensitive substring match
   *
   * @param jobDescription - The job description text to analyze
   * @param excludedKeywords - Array of keywords to filter (e.g., ["php", "python", "java "])
   * @returns FilterResult with filtered flag and matched keywords
   */
  shouldFilter(jobDescription: string, excludedKeywords: string[]): FilterResult {
    const matchedKeywords: string[] = [];

    for (const keyword of excludedKeywords) {
      // Handle keywords with trailing space (require word boundary)
      if (keyword.endsWith(' ')) {
        const exactKeyword = keyword.trim();
        const regex = new RegExp(`\\b${this.escapeRegex(exactKeyword)}\\b`, 'i');
        if (regex.test(jobDescription)) {
          matchedKeywords.push(keyword);
        }
      } else {
        // Regular substring match (case-insensitive)
        if (jobDescription.toLowerCase().includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      }
    }

    const filtered = matchedKeywords.length > 0;

    if (filtered) {
      this.logger.debug(`Job filtered out (matched: ${matchedKeywords.join(', ')})`);
    }

    return {
      filtered,
      matchedKeywords,
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
```

**Test:** Create a unit test

```bash
# Create test file
cat > apps/backend/src/modules/llm-evaluation/domain/services/keyword-filter.service.spec.ts << 'EOF'
import { KeywordFilterService } from './keyword-filter.service';

describe('KeywordFilterService', () => {
  let service: KeywordFilterService;

  beforeEach(() => {
    service = new KeywordFilterService();
  });

  it('should filter job with exact keyword match (with trailing space)', () => {
    const description = 'We are looking for a Java developer...';
    const result = service.shouldFilter(description, ['java ']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toContain('java ');
  });

  it('should NOT filter JavaScript when looking for "java "', () => {
    const description = 'We need a JavaScript expert...';
    const result = service.shouldFilter(description, ['java ']);

    expect(result.filtered).toBe(false);
  });

  it('should filter job with substring match', () => {
    const description = 'Must have PHP experience...';
    const result = service.shouldFilter(description, ['php']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toContain('php');
  });

  it('should be case-insensitive', () => {
    const description = 'Python or PYTHON is required';
    const result = service.shouldFilter(description, ['python']);

    expect(result.filtered).toBe(true);
  });

  it('should return all matched keywords', () => {
    const description = 'PHP, Python, and Java required';
    const result = service.shouldFilter(description, ['php', 'python', 'java ']);

    expect(result.filtered).toBe(true);
    expect(result.matchedKeywords).toHaveLength(3);
  });

  it('should not filter when no keywords match', () => {
    const description = 'TypeScript and React position';
    const result = service.shouldFilter(description, ['php', 'python', 'java ']);

    expect(result.filtered).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });
});
EOF
```

```bash
# Run tests
pnpm --filter @job-search/backend test keyword-filter.service
```

**Success Criteria:** ✅ All 6 tests pass

---

## Step 7: Implement LlmEvaluationService

**File:** `apps/backend/src/modules/llm-evaluation/domain/services/llm-evaluation.service.ts`

**Code:**

````typescript
import { Injectable, Logger } from '@nestjs/common';
import { Job } from '@/modules/jobs/domain/models/job.model';
import { LlmApiErrorException } from '../../exceptions/llm-api-error.exception';

export interface EvaluationResult {
  score: number;
  scoreReasoning: string;
  scoreCriteria: Record<string, number>;
}

/**
 * Service for evaluating jobs using LLM (OpenRouter API).
 * Calls the LLM with job details and user preferences to get a 0-100 score.
 */
@Injectable()
export class LlmEvaluationService {
  private readonly logger = new Logger(LlmEvaluationService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    // Read from environment (prioritize OPENROUTER_API_KEY, fallback to ANTHROPIC_API_KEY)
    this.apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('No LLM API key found in environment variables');
    }
  }

  /**
   * Evaluate a job using the LLM
   *
   * @param job - The job to evaluate
   * @param systemPrompt - Custom instructions for the LLM
   * @param scoringCriteria - Array of criteria to score against
   * @param llmModel - Model to use (e.g., "anthropic/claude-3.5-sonnet")
   * @returns EvaluationResult with score, reasoning, and criteria scores
   */
  async evaluateJob(
    job: Job,
    systemPrompt: string,
    scoringCriteria: string[],
    llmModel: string,
  ): Promise<EvaluationResult> {
    if (!this.apiKey) {
      throw new LlmApiErrorException('LLM API key not configured');
    }

    this.logger.log(`Evaluating job ${job.id} with model ${llmModel}`);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://job-search-automation.local', // Required by OpenRouter
          'X-Title': 'Job Search Automation', // Optional but recommended
        },
        body: JSON.stringify({
          model: llmModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: this.buildEvaluationPrompt(job, scoringCriteria),
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent scoring
          response_format: { type: 'json_object' }, // Request structured JSON output
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new LlmApiErrorException(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const completion = data.choices?.[0]?.message?.content;

      if (!completion) {
        throw new LlmApiErrorException('No completion in LLM response');
      }

      // Parse LLM response (expects JSON with score, reasoning, criteria)
      return this.parseEvaluationResponse(completion);
    } catch (error) {
      if (error instanceof LlmApiErrorException) {
        throw error;
      }
      throw new LlmApiErrorException(`Failed to evaluate job: ${error.message}`);
    }
  }

  /**
   * Build the evaluation prompt for the LLM
   */
  private buildEvaluationPrompt(job: Job, criteria: string[]): string {
    return `
Evaluate this job posting and score it from 0-100 based on how well it matches the user's preferences.

**Job Details:**
- Title: ${job.jobTitle}
- Company: ${job.companyName}
- Location: ${job.location}
- Seniority: ${job.seniorityLevel || 'Not specified'}
- Employment Type: ${job.employmentType || 'Not specified'}

**Job Description:**
${job.jobDescription}

**Scoring Criteria:**
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Instructions:**
- Evaluate each criterion individually (0-100)
- Calculate overall score as weighted average
- Provide 2-3 sentence reasoning for the overall score

**Response Format (JSON only):**
\`\`\`json
{
  "overallScore": <0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "criteriaScores": {
    "${criteria[0]}": <0-100>,
    "${criteria[1] || 'N/A'}": <0-100>
  }
}
\`\`\`
    `.trim();
  }

  /**
   * Parse the LLM response to extract score, reasoning, and criteria
   */
  private parseEvaluationResponse(completion: string): EvaluationResult {
    // Extract JSON from markdown code blocks if present
    const jsonMatch =
      completion.match(/```json\s*\n([\s\S]+?)\n```/) || completion.match(/\{[\s\S]+\}/);

    if (!jsonMatch) {
      throw new LlmApiErrorException('LLM response did not contain valid JSON');
    }

    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate response structure
      if (
        typeof parsed.overallScore !== 'number' ||
        typeof parsed.reasoning !== 'string' ||
        typeof parsed.criteriaScores !== 'object'
      ) {
        throw new Error('Invalid response structure');
      }

      // Clamp score to 0-100
      const score = Math.max(0, Math.min(100, Math.round(parsed.overallScore)));

      return {
        score,
        scoreReasoning: parsed.reasoning,
        scoreCriteria: parsed.criteriaScores,
      };
    } catch (error) {
      throw new LlmApiErrorException(`Failed to parse LLM response JSON: ${error.message}`);
    }
  }
}
````

**Test:** Manual test with mock job (Step 11)

**Success Criteria:** ✅ TypeScript compiles without errors

---

## Step 8: Implement Exception Classes

**File:** `apps/backend/src/modules/llm-evaluation/exceptions/llm-api-error.exception.ts`

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export class LlmApiErrorException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'LLM API Error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

**File:** `apps/backend/src/modules/llm-evaluation/exceptions/keyword-filtered.exception.ts`

```typescript
/**
 * Exception thrown when a job is filtered out by keyword matching.
 * Not an HTTP exception - used for internal flow control.
 */
export class KeywordFilteredException extends Error {
  constructor(
    public readonly jobId: string,
    public readonly matchedKeywords: string[],
  ) {
    super(`Job ${jobId} filtered out (matched: ${matchedKeywords.join(', ')})`);
    this.name = 'KeywordFilteredException';
  }
}
```

**Test:** TypeScript compilation

```bash
pnpm --filter @job-search/backend typecheck
```

**Success Criteria:** ✅ No TypeScript errors

---

## Step 9: Implement Event Handler (Core Logic)

**File:** `apps/backend/src/modules/llm-evaluation/events/handlers/jobs-scraped.handler.ts`

**Code:**

```typescript
import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobsScrapedEvent } from '@/modules/jobs/domain/events/jobs-scraped.event';
import { JobRepository } from '@/modules/jobs/domain/repositories/job.repository';
import { UserPreferenceRepository } from '../../domain/repositories/user-preference.repository';
import { KeywordFilterService } from '../../domain/services/keyword-filter.service';
import { LlmEvaluationService } from '../../domain/services/llm-evaluation.service';
import { JobEvaluatedEvent } from '@/modules/jobs/domain/events/job-evaluated.event';
import { JobStatus } from '@/modules/jobs/domain/enums/job-status.enum';

/**
 * Event handler that subscribes to JobsScrapedEvent.
 * Evaluates each job using keyword filtering + LLM scoring.
 *
 * Per architecture rules (Events Rules, line 124):
 * "Event handlers only handle side effects (enqueue jobs, notify other modules).
 * They never modify the entity that originated the event."
 *
 * This handler is a side effect that enriches jobs with LLM scores.
 */
@EventsHandler(JobsScrapedEvent)
export class JobsScrapedEvaluationHandler implements IEventHandler<JobsScrapedEvent> {
  private readonly logger = new Logger(JobsScrapedEvaluationHandler.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userPreferenceRepository: UserPreferenceRepository,
    private readonly keywordFilterService: KeywordFilterService,
    private readonly llmEvaluationService: LlmEvaluationService,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: JobsScrapedEvent): Promise<void> {
    this.logger.log(`Evaluating ${event.jobIds.length} scraped jobs`);

    // Fetch user preferences (for now, use default)
    const preferences = await this.userPreferenceRepository.findDefault();

    if (!preferences) {
      this.logger.warn('No user preferences found, skipping evaluation');
      return;
    }

    let evaluatedCount = 0;
    let filteredCount = 0;
    let errorCount = 0;

    for (const jobId of event.jobIds) {
      try {
        const job = await this.jobRepository.findById(jobId);

        if (!job) {
          this.logger.warn(`Job ${jobId} not found, skipping`);
          continue;
        }

        // Skip if already evaluated (idempotency)
        if (job.score !== null && job.score !== undefined) {
          this.logger.debug(`Job ${jobId} already evaluated (score: ${job.score}), skipping`);
          continue;
        }

        // Step 1: Keyword filtering (pre-filter to reduce LLM costs)
        const filterResult = this.keywordFilterService.shouldFilter(
          job.jobDescription,
          preferences.excludedKeywords,
        );

        if (filterResult.filtered) {
          this.logger.log(
            `Job ${jobId} filtered out (matched: ${filterResult.matchedKeywords.join(', ')})`,
          );
          filteredCount++;
          continue; // Skip LLM evaluation
        }

        // Step 2: LLM evaluation
        const evaluation = await this.llmEvaluationService.evaluateJob(
          job,
          preferences.systemPrompt,
          preferences.scoringCriteria,
          preferences.llmModel,
        );

        // Step 3: Update job with score
        job.score = evaluation.score;
        job.scoreReasoning = evaluation.scoreReasoning;
        job.scoreCriteria = evaluation.scoreCriteria;
        job.scoredAt = new Date();

        // Step 4: Promote to EVALUATED status if score meets threshold
        if (evaluation.score >= preferences.minScoreThreshold) {
          job.status = JobStatus.EVALUATED;
        }

        await this.jobRepository.save(job);

        // Step 5: Publish JobEvaluatedEvent
        this.eventBus.publish(
          new JobEvaluatedEvent(
            job.id,
            evaluation.score,
            evaluation.scoreReasoning,
            evaluation.scoreCriteria,
          ),
        );

        this.logger.log(
          `Job ${jobId} evaluated: score ${evaluation.score}/${preferences.minScoreThreshold} ` +
            `(status: ${job.status})`,
        );
        evaluatedCount++;
      } catch (error) {
        this.logger.error(`Failed to evaluate job ${jobId}:`, error.stack);
        errorCount++;
        // Continue with next job (don't fail entire batch)
      }
    }

    this.logger.log(
      `Evaluation complete: ${evaluatedCount} evaluated, ${filteredCount} filtered, ` +
        `${errorCount} errors`,
    );
  }
}
```

**Test:** Integration test (Step 11)

**Success Criteria:** ✅ TypeScript compiles without errors

---

## Step 10: Wire Up LLM Evaluation Module

**File:** `apps/backend/src/modules/llm-evaluation/llm-evaluation.module.ts`

**Code:**

```typescript
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserPreferenceRepository } from './domain/repositories/user-preference.repository';
import { KeywordFilterService } from './domain/services/keyword-filter.service';
import { LlmEvaluationService } from './domain/services/llm-evaluation.service';
import { JobsScrapedEvaluationHandler } from './events/handlers/jobs-scraped.handler';
import { DatabaseModule } from '@/database/database.module';
import { JobsModule } from '@/modules/jobs/jobs.module';

const EventHandlers = [JobsScrapedEvaluationHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, JobsModule],
  providers: [
    UserPreferenceRepository,
    KeywordFilterService,
    LlmEvaluationService,
    ...EventHandlers,
  ],
  exports: [UserPreferenceRepository, KeywordFilterService, LlmEvaluationService],
})
export class LlmEvaluationModule {}
```

**File:** `apps/backend/src/app.module.ts` (update imports)

**Before:**

```typescript
@Module({
  imports: [
    CqrsModule.forRoot(),
    DatabaseModule,
    QueueModule,
    ApifyModule,
    JobsModule,
  ],
})
```

**After:**

```typescript
import { LlmEvaluationModule } from './modules/llm-evaluation/llm-evaluation.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    DatabaseModule,
    QueueModule,
    ApifyModule,
    JobsModule,
    LlmEvaluationModule, // 👈 Add this
  ],
})
```

**Test:** Build and start server

```bash
# Clean build
rm -f tsconfig.tsbuildinfo && pnpm --filter @job-search/backend build

# Start server
pnpm --filter @job-search/backend dev
```

**Success Criteria:** ✅ Server starts without errors, logs show module loaded

---

## Step 11: Remove Old Event Handler from Jobs Module

**Problem:** There's already a `JobsScrapedHandler` in the jobs module (placeholder). We need to remove it to avoid duplicate event handlers.

**File:** `apps/backend/src/modules/jobs/jobs.module.ts`

**Action:** Remove `JobsScrapedHandler` from providers

**Before:**

```typescript
import { JobsScrapedHandler } from './domain/events/handlers/jobs-scraped.handler';

const EventHandlers = [JobsScrapedHandler, JobStatusChangedHandler];
```

**After:**

```typescript
// Remove JobsScrapedHandler import
const EventHandlers = [JobStatusChangedHandler];
```

**Also delete the file:**

```bash
rm apps/backend/src/modules/jobs/domain/events/handlers/jobs-scraped.handler.ts
```

**Test:** Rebuild and verify no duplicate handlers

```bash
pnpm --filter @job-search/backend typecheck
pnpm --filter @job-search/backend build
```

**Success Criteria:** ✅ Build succeeds, only one JobsScrapedEvent handler registered

---

## Step 12: Seed Default User Preferences

**File:** `apps/backend/src/modules/llm-evaluation/seed-preferences.ts` (create this)

**Code:**

```typescript
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedUserPreferences() {
  const defaultPreference = await prisma.userPreference.findFirst({
    where: { isDefault: true },
  });

  if (defaultPreference) {
    console.log('Default user preference already exists, skipping seed');
    return;
  }

  await prisma.userPreference.create({
    data: {
      id: randomUUID(),
      systemPrompt: `You are an expert job evaluator. Score jobs based on how well they match the candidate's preferences for:
- Remote-first companies
- TypeScript/Node.js/React stack
- Product-focused engineering culture
- Competitive compensation

Be objective and thorough in your evaluation. Provide specific reasoning for your scores.`,

      scoringCriteria: [
        'Remote work flexibility',
        'Modern tech stack (TypeScript/React/Node.js)',
        'Product engineering culture',
        'Company growth stage and funding',
        'Competitive salary range',
      ],

      excludedKeywords: ['php', 'python', 'java '], // Note: space after "java" to exclude Java but keep JavaScript

      minScoreThreshold: 70,

      llmProvider: 'openrouter',
      llmModel: 'google/gemini-2.5-flash', // Fast, cost-effective reasoning model

      userId: null, // No user association yet
      isDefault: true,
    },
  });

  console.log('✅ Default user preference seeded');
}

seedUserPreferences()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
```

**Test:** Run seed script

```bash
# Run seed
pnpm tsx apps/backend/src/modules/llm-evaluation/seed-preferences.ts

# Verify in database
pnpm --filter @job-search/backend db:studio
# → Check UserPreference table has one record with isDefault = true
```

**Success Criteria:** ✅ Default user preference exists in database

---

## Step 13: End-to-End Test

**Test the full flow:**

```bash
# 1. Ensure server is running
pnpm --filter @job-search/backend dev

# 2. Trigger a job scrape (small count for testing)
curl -X POST http://localhost:3000/apify/scrape \
  -H "Content-Type: application/json" \
  -d '{"count": 3}'

# 3. Monitor logs for:
# - "JobsScrapedEvent published for X jobs" (from ApifyProcessor)
# - "Evaluating X scraped jobs" (from JobsScrapedEvaluationHandler)
# - "Job <id> filtered out" OR "Job <id> evaluated: score X/70"
# - "Evaluation complete: X evaluated, Y filtered, Z errors"

# 4. Check database
pnpm --filter @job-search/backend db:studio
# → Job table should have records with score, scoreReasoning, scoreCriteria filled
# → Jobs with score >= 70 should have status = EVALUATED
```

**Expected Log Output:**

```
[ApifyProcessor] Job <bullmq-id> complete — 3 jobs scraped, saving to DB
[SaveScrapedJobsHandler] Upserted 3 jobs from scrape
[ApifyProcessor] JobsScrapedEvent published for 3 jobs
[JobsScrapedEvaluationHandler] Evaluating 3 scraped jobs
[KeywordFilterService] Job <id1> filtered out (matched: php)
[LlmEvaluationService] Evaluating job <id2> with model google/gemini-2.5-flash
[JobsScrapedEvaluationHandler] Job <id2> evaluated: score 85/70 (status: EVALUATED)
[LlmEvaluationService] Evaluating job <id3> with model google/gemini-2.5-flash
[JobsScrapedEvaluationHandler] Job <id3> evaluated: score 45/70 (status: NEW)
[JobsScrapedEvaluationHandler] Evaluation complete: 2 evaluated, 1 filtered, 0 errors
```

**Success Criteria:**

- ✅ Jobs are scraped and saved
- ✅ JobsScrapedEvent is published
- ✅ Keyword filtering works (logs show filtered jobs)
- ✅ LLM evaluation runs (logs show API calls)
- ✅ Jobs are updated with scores in database
- ✅ High-scoring jobs (≥70) have status = EVALUATED
- ✅ JobEvaluatedEvent is published for each scored job

---

## Step 14: Update Documentation

**File:** `.claude/skills/job-search-automation/SKILL.md`

**Action:** Update the "What's Implemented" section

**Add to "What's Implemented ✅":**

```markdown
6. **LLM Evaluation** - Keyword filtering + OpenRouter scoring
7. **User Preferences** - Configurable criteria and excluded keywords
```

**Remove from "What's NOT Implemented ❌":**

```markdown
1. ~~LLM Evaluation - Job scoring against preferences~~
2. ~~User Preferences - Criteria storage and management~~
```

**Success Criteria:** ✅ Documentation reflects current state

---

## Troubleshooting

### Issue: "No user preferences found"

**Solution:** Run the seed script (Step 12)

```bash
pnpm tsx apps/backend/src/modules/llm-evaluation/seed-preferences.ts
```

### Issue: "LLM API key not configured"

**Solution:** Verify `.env` file has `OPENROUTER_API_KEY` set

```bash
grep OPENROUTER_API_KEY apps/backend/.env
```

### Issue: Jobs not being evaluated

**Checklist:**

1. Check server logs for "Evaluating X scraped jobs"
2. Verify default user preference exists (`isDefault = true`)
3. Check if jobs already have scores (handler skips re-evaluation)
4. Verify LlmEvaluationModule is imported in AppModule

### Issue: OpenRouter API errors

**Common causes:**

- Invalid API key → Check `.env`
- Model not available → Try alternative models:
  - `google/gemini-2.0-flash` (faster, slightly older)
  - `anthropic/claude-3.5-haiku` (more expensive but very reliable)
  - `deepseek/deepseek-v3.2` (cheapest option)
- Rate limit → Add retry logic or slow down requests
- Gemini requires `response_format: { type: 'json_object' }` for structured output

### Issue: TypeScript errors about Job model

**Solution:** Ensure Job model has public getters for all fields used in `LlmEvaluationService.buildEvaluationPrompt()`

```typescript
// In Job model, ensure these exist:
get jobTitle(): string { ... }
get companyName(): string { ... }
get location(): string { ... }
get seniorityLevel(): string | null { ... }
get employmentType(): string | null { ... }
get jobDescription(): string { ... }
```

---

## Summary

**Implementation Checklist:**

- [ ] Step 1: Database schema updated with UserPreference table
- [ ] Step 2: OPENROUTER_API_KEY added to .env
- [ ] Step 3: Module directory structure created
- [ ] Step 4: UserPreference domain model implemented
- [ ] Step 5: UserPreferenceRepository implemented
- [ ] Step 6: KeywordFilterService implemented + tested
- [ ] Step 7: LlmEvaluationService implemented
- [ ] Step 8: Exception classes created
- [ ] Step 9: JobsScrapedEvaluationHandler implemented
- [ ] Step 10: LlmEvaluationModule wired up in AppModule
- [ ] Step 11: Old placeholder handler removed from JobsModule
- [ ] Step 12: Default user preferences seeded
- [ ] Step 13: End-to-end test passed
- [ ] Step 14: Documentation updated

**Final Verification:**

```bash
# 1. Clean build
rm -f tsconfig.tsbuildinfo && pnpm --filter @job-search/backend build

# 2. Run tests
pnpm --filter @job-search/backend test

# 3. Start server
pnpm --filter @job-search/backend dev

# 4. Trigger scrape
curl -X POST http://localhost:3000/apify/scrape -H "Content-Type: application/json" -d '{"count": 5}'

# 5. Verify in database (should see scored jobs)
pnpm --filter @job-search/backend db:studio
```

**Cost Estimation:**

- Apify: ~$0.003 per job scraped
- OpenRouter (Gemini 2.5 Flash): ~$0.0006 per job evaluated
  - Input: 800 tokens × $0.30/1M = $0.00024
  - Output: 200 tokens × $2.50/1M = $0.0005
  - User preferences cached (90% discount after first use)
- **Total per job:** ~$0.0036
- **Example:** 100 jobs/day = $0.36/day = $10.80/month

Cost comparison vs Claude 3.5 Sonnet ($54/month): **5x cheaper!**

To reduce costs further:

- Aggressive keyword filtering (fewer LLM calls)
- Use cached prompts (user preferences stay the same)
- Consider `deepseek/deepseek-v3.2` for even lower costs (~$0.0003/job)
