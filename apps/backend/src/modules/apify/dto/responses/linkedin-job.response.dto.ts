import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents a single LinkedIn job listing as returned by the
 * curious_coder/linkedin-jobs-search-scraper Apify actor.
 */
export class LinkedinJobResponseDto {
  @ApiProperty({ example: 4374258882 })
  id!: number;

  @ApiProperty({ example: 'Senior Node.js Developer - Multi Million Daily Requests' })
  title!: string;

  @ApiProperty({ example: 'Signify Technology' })
  companyName!: string;

  @ApiProperty({ example: 'https://www.linkedin.com/company/signify-technology/life' })
  companyLinkedinUrl!: string;

  @ApiProperty({ example: 'Portugal (Remote)' })
  location!: string;

  @ApiPropertyOptional({ example: 'https://media.licdn.com/...', nullable: true })
  companyLogo?: string;

  @ApiProperty({ example: true })
  easyApply!: boolean;

  @ApiProperty({ example: 'https://www.linkedin.com/jobs/view/4374258882' })
  link!: string;

  @ApiPropertyOptional({ example: 'https://apply.workable.com/...' })
  applyUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  applies?: number;

  @ApiPropertyOptional({ example: 0 })
  views?: number;

  @ApiPropertyOptional({ example: true })
  workRemoteAllowed?: boolean;

  @ApiPropertyOptional({ example: 'Full-time' })
  employmentStatus?: string;

  @ApiPropertyOptional({ example: 'Mid-Senior level' })
  formattedExperienceLevel?: string;

  @ApiPropertyOptional({ example: ['IT'] })
  jobFunctions?: string[];

  @ApiPropertyOptional({ example: ['Information Technology'] })
  formattedJobFunctions?: string[];

  @ApiPropertyOptional({ example: ['Software Development'] })
  formattedIndustries?: string[];

  @ApiProperty()
  descriptionText!: string;

  @ApiPropertyOptional()
  formattedDescription?: string;

  @ApiProperty({ example: '2026-02-23T10:57:57.000Z' })
  postedAt!: string;

  @ApiPropertyOptional({ example: 1771844277000 })
  postedAtTimestamp?: number;

  @ApiPropertyOptional({ example: 1774436277000 })
  expireAt?: number;

  @ApiPropertyOptional({ example: 'PT' })
  country?: string;

  @ApiPropertyOptional({ example: ['Remote'] })
  workplaceTypes?: string[];

  @ApiPropertyOptional({ example: 'Javascript Developer' })
  standardizedTitle?: string;

  @ApiPropertyOptional({ example: false })
  isReposted?: boolean;

  @ApiPropertyOptional({ example: true })
  isPromoted?: boolean;

  @ApiPropertyOptional()
  salaryInsights?: {
    lockModuleShown: boolean;
    salaryExplorerUrl: string;
    insightExists: boolean;
    jobCompensationAvailable: boolean;
  };

  @ApiPropertyOptional()
  applyingInfo?: {
    closed: boolean;
  };

  @ApiPropertyOptional({ example: [] })
  benefits?: string[];
}
