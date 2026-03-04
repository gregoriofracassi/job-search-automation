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
