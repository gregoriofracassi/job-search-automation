import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Job } from '../models/job.model';
import { JobStatus } from '../enums/job-status.enum';
import { mapPrismaJobToDomain } from './helpers/job.mapper';

export interface ListJobsFilter {
  status?: JobStatus[];
  minScore?: number;
  maxScore?: number;
  employmentType?: string;
  workSchedule?: string;
  location?: string;
}

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Job | null> {
    const record = await this.prisma.job.findUnique({ where: { id } });
    return record ? mapPrismaJobToDomain(record) : null;
  }

  async findByJobId(jobId: string): Promise<Job | null> {
    const record = await this.prisma.job.findUnique({ where: { jobId } });
    return record ? mapPrismaJobToDomain(record) : null;
  }

  async list(filter: ListJobsFilter = {}): Promise<Job[]> {
    const where: Record<string, unknown> = {};

    if (filter.status?.length) {
      where.status = { in: filter.status as any[] };
    }
    if (filter.minScore !== undefined) {
      where.score = { ...(where.score as object), gte: filter.minScore };
    }
    if (filter.maxScore !== undefined) {
      where.score = { ...(where.score as object), lte: filter.maxScore };
    }
    if (filter.employmentType) {
      where.employmentType = { contains: filter.employmentType, mode: 'insensitive' };
    }
    if (filter.location) {
      where.location = { contains: filter.location, mode: 'insensitive' };
    }

    const records = await this.prisma.job.findMany({
      where,
      orderBy: [{ score: 'desc' }, { scrapedAt: 'desc' }],
    });

    return records.map(mapPrismaJobToDomain);
  }

  /**
   * Upsert by LinkedIn job_id — re-scraping the same job updates it, never duplicates.
   */
  async upsert(job: Job): Promise<void> {
    const data = {
      jobId: job.jobId,
      jobUrl: job.jobUrl,
      applyUrl: job.applyUrl,
      easyApply: job.easyApply,
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      companyUrl: job.companyUrl,
      companyLogoUrl: job.companyLogoUrl,
      location: job.location,
      seniorityLevel: job.seniorityLevel,
      employmentType: job.employmentType,
      jobFunction: job.jobFunction,
      industries: job.industries,
      jobDescription: job.jobDescription,
      jobDescriptionHtml: job.jobDescriptionHtml,
      timePosted: job.timePosted,
      numApplicants: job.numApplicants,
      salaryRange: job.salaryRange,
      scrapedAt: job.scrapedAt,
      scrapeKeywords: job.scrapeKeywords,
      scrapeLocation: job.scrapeLocation,
      score: job.score,
      scoreReasoning: job.scoreReasoning,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scoreCriteria: job.scoreCriteria as any,
      scoredAt: job.scoredAt,
      status: job.status as any,
      appliedAt: job.appliedAt,
      notes: job.notes,
    };

    await this.prisma.job.upsert({
      where: { jobId: job.jobId },
      create: { id: job.id, ...data },
      update: data,
    });
  }

  async save(job: Job): Promise<void> {
    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        score: job.score,
        scoreReasoning: job.scoreReasoning,
        scoreCriteria: job.scoreCriteria as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        scoredAt: job.scoredAt,
        status: job.status as any,
        appliedAt: job.appliedAt,
        notes: job.notes,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.job.delete({ where: { id } });
  }
}
