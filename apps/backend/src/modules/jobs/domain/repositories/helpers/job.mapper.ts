import { Job as PrismaJob } from '@prisma/client';
import { Job } from '../../models/job.model';
import { JobStatus } from '../../enums/job-status.enum';

export function mapPrismaJobToDomain(record: PrismaJob): Job {
  return new Job({
    id: record.id,
    jobId: record.jobId,
    jobUrl: record.jobUrl,
    applyUrl: record.applyUrl,
    easyApply: record.easyApply,
    jobTitle: record.jobTitle,
    companyName: record.companyName,
    companyUrl: record.companyUrl,
    companyLogoUrl: record.companyLogoUrl,
    location: record.location,
    seniorityLevel: record.seniorityLevel,
    employmentType: record.employmentType,
    jobFunction: record.jobFunction,
    industries: record.industries,
    jobDescription: record.jobDescription,
    jobDescriptionHtml: record.jobDescriptionHtml,
    timePosted: record.timePosted,
    numApplicants: record.numApplicants,
    salaryRange: record.salaryRange,
    scrapedAt: record.scrapedAt,
    scrapeKeywords: record.scrapeKeywords,
    scrapeLocation: record.scrapeLocation,
    score: record.score,
    scoreReasoning: record.scoreReasoning,
    scoreCriteria: record.scoreCriteria as Record<string, number> | null,
    scoredAt: record.scoredAt,
    status: record.status as JobStatus,
    appliedAt: record.appliedAt,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
