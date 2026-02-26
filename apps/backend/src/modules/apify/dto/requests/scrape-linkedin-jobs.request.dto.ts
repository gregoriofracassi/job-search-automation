import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsUrl, Min } from 'class-validator';

/**
 * Request DTO for scraping LinkedIn jobs.
 * The actor uses a single LinkedIn search URL per run.
 * Multiple URLs are processed sequentially.
 */
export class ScrapeLinkedinJobsRequestDto {
  @ApiPropertyOptional({
    description:
      'Array of LinkedIn job search URLs to scrape. If not provided, uses hardcoded URLs from config. Each URL is processed as a separate actor run.',
    example: [
      'https://www.linkedin.com/jobs/search/?f_WT=2&keywords=backend&origin=JOB_SEARCH_PAGE_JOB_FILTER',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  urls?: string[];

  @ApiPropertyOptional({
    description: 'Total number of records to scrape per URL. Leave empty to scrape all results.',
    example: 25,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @ApiPropertyOptional({
    description:
      'Scrape additional job details (benefits, hiring team, company info). This is slower and requires more requests.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  scrapeJobDetails?: boolean;

  @ApiPropertyOptional({
    description: 'Scrape skills requirements. This is slower and requires more requests.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  scrapeSkills?: boolean;

  @ApiPropertyOptional({
    description: 'Scrape company details. This is slower and requires more requests.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  scrapeCompany?: boolean;
}
