import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SaveScrapedJobsCommand } from '../impl/save-scraped-jobs.command';
import { JobRepository } from '../../domain/repositories/job.repository';
import { Job } from '../../domain/models/job.model';
import { JobStatus } from '../../domain/enums/job-status.enum';

@CommandHandler(SaveScrapedJobsCommand)
export class SaveScrapedJobsHandler implements ICommandHandler<SaveScrapedJobsCommand, string[]> {
  private readonly logger = new Logger(SaveScrapedJobsHandler.name);

  constructor(private readonly jobRepository: JobRepository) {}

  async execute(command: SaveScrapedJobsCommand): Promise<string[]> {
    const now = new Date();
    const jobIds: string[] = [];

    for (const raw of command.jobs) {
      const id = randomUUID();

      // Map the new actor output format to our database schema
      const job = new Job({
        id,
        jobId: String(raw.id), // Convert number to string
        jobUrl: raw.link,
        applyUrl: raw.applyUrl ?? null,
        easyApply: raw.easyApply ?? false,
        jobTitle: raw.title,
        companyName: raw.companyName,
        companyUrl: raw.companyLinkedinUrl ?? null,
        companyLogoUrl: raw.companyLogo ?? null,
        location: raw.location,
        seniorityLevel: raw.formattedExperienceLevel ?? null,
        employmentType: raw.employmentStatus ?? null,
        jobFunction: raw.formattedJobFunctions?.join(', ') ?? null,
        industries: raw.formattedIndustries?.join(', ') ?? null,
        jobDescription: raw.descriptionText,
        jobDescriptionHtml: raw.formattedDescription ?? raw.descriptionText,
        timePosted: raw.postedAt ?? null,
        numApplicants: raw.applies !== undefined ? String(raw.applies) : null,
        salaryRange: null, // New actor doesn't provide salary in basic output
        scrapedAt: now,
        scrapeKeywords: null, // Will be extracted from URL in future
        scrapeLocation: null, // Will be extracted from URL in future
        score: null,
        scoreReasoning: null,
        scoreCriteria: null,
        scoredAt: null,
        status: JobStatus.NEW,
        appliedAt: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      });

      await this.jobRepository.upsert(job);
      jobIds.push(id);
    }

    this.logger.log(`Upserted ${jobIds.length} jobs from scrape`);

    // Per architecture rules (Events Rules, line 123):
    // "Events are published from command handlers after state is persisted"
    // Note: In this implementation, the event is published by the ApifyProcessor
    // after this handler completes, since the processor orchestrates the workflow.
    // The handler returns jobIds to enable event publishing.

    return jobIds;
  }
}
