import { Injectable, Logger } from '@nestjs/common';
import { Job } from '@/modules/jobs/domain/models/job.model';
import { LlmApiErrorException } from '../../exceptions/llm-api-error.exception';

export interface EvaluationResult {
  score: number;
  scoreReasoning: string;
  scoreCriteria: Record<string, number>;
}

/**
 * Service for evaluating jobs using LLM (OpenRouter API with Gemini 2.5 Flash).
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
   * @param llmModel - Model to use (e.g., "google/gemini-2.5-flash")
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

      const data = (await response.json()) as any;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new LlmApiErrorException(`Failed to evaluate job: ${errorMessage}`);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new LlmApiErrorException(`Failed to parse LLM response JSON: ${errorMessage}`);
    }
  }
}
