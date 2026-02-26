import { AggregateRoot } from '@nestjs/cqrs';
import { JobStatus } from '../enums/job-status.enum';
import { InvalidJobTransitionException } from '../../exceptions/invalid-job-transition.exception';

export interface JobProps {
  id: string;
  jobId: string;
  jobUrl: string;
  applyUrl: string | null;
  easyApply: boolean;
  jobTitle: string;
  companyName: string;
  companyUrl: string | null;
  companyLogoUrl: string | null;
  location: string;
  seniorityLevel: string | null;
  employmentType: string | null;
  jobFunction: string | null;
  industries: string | null;
  jobDescription: string;
  jobDescriptionHtml: string;
  timePosted: string | null;
  numApplicants: string | null;
  salaryRange: string | null;
  scrapedAt: Date;
  scrapeKeywords: string | null;
  scrapeLocation: string | null;
  score: number | null;
  scoreReasoning: string | null;
  scoreCriteria: Record<string, number> | null;
  scoredAt: Date | null;
  status: JobStatus;
  appliedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Job extends AggregateRoot {
  #props: JobProps;

  constructor(props: JobProps) {
    super();
    this.#props = props;
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  get id() {
    return this.#props.id;
  }
  get jobId() {
    return this.#props.jobId;
  }
  get jobUrl() {
    return this.#props.jobUrl;
  }
  get applyUrl() {
    return this.#props.applyUrl;
  }
  get easyApply() {
    return this.#props.easyApply;
  }
  get jobTitle() {
    return this.#props.jobTitle;
  }
  get companyName() {
    return this.#props.companyName;
  }
  get companyUrl() {
    return this.#props.companyUrl;
  }
  get companyLogoUrl() {
    return this.#props.companyLogoUrl;
  }
  get location() {
    return this.#props.location;
  }
  get seniorityLevel() {
    return this.#props.seniorityLevel;
  }
  get employmentType() {
    return this.#props.employmentType;
  }
  get jobFunction() {
    return this.#props.jobFunction;
  }
  get industries() {
    return this.#props.industries;
  }
  get jobDescription() {
    return this.#props.jobDescription;
  }
  get jobDescriptionHtml() {
    return this.#props.jobDescriptionHtml;
  }
  get timePosted() {
    return this.#props.timePosted;
  }
  get numApplicants() {
    return this.#props.numApplicants;
  }
  get salaryRange() {
    return this.#props.salaryRange;
  }
  get scrapedAt() {
    return this.#props.scrapedAt;
  }
  get scrapeKeywords() {
    return this.#props.scrapeKeywords;
  }
  get scrapeLocation() {
    return this.#props.scrapeLocation;
  }
  get score() {
    return this.#props.score;
  }
  get scoreReasoning() {
    return this.#props.scoreReasoning;
  }
  get scoreCriteria() {
    return this.#props.scoreCriteria;
  }
  get scoredAt() {
    return this.#props.scoredAt;
  }
  get status() {
    return this.#props.status;
  }
  get appliedAt() {
    return this.#props.appliedAt;
  }
  get notes() {
    return this.#props.notes;
  }
  get createdAt() {
    return this.#props.createdAt;
  }
  get updatedAt() {
    return this.#props.updatedAt;
  }

  // ─── State transitions ────────────────────────────────────────────────────

  /**
   * Called when the LLM has evaluated this job.
   * Valid from any status — re-scoring is always allowed.
   */
  applyScore(value: number, reasoning: string, criteria: Record<string, number>): void {
    this.#props.score = value;
    this.#props.scoreReasoning = reasoning;
    this.#props.scoreCriteria = criteria;
    this.#props.scoredAt = new Date();
    if (this.#props.status === JobStatus.NEW) {
      this.#props.status = JobStatus.EVALUATED;
    }
  }

  /**
   * User bookmarks the job as interesting.
   * Valid from NEW or EVALUATED.
   */
  save(): void {
    const allowed = [JobStatus.NEW, JobStatus.EVALUATED];
    if (!allowed.includes(this.#props.status)) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.SAVED);
    }
    this.#props.status = JobStatus.SAVED;
  }

  /**
   * User submits an application.
   * Valid from SAVED or EVALUATED (allow skipping the bookmark step).
   */
  markApplied(): void {
    const allowed = [JobStatus.SAVED, JobStatus.EVALUATED, JobStatus.NEW];
    if (!allowed.includes(this.#props.status)) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.APPLIED);
    }
    this.#props.status = JobStatus.APPLIED;
    this.#props.appliedAt = new Date();
  }

  /**
   * User got an interview.
   * Valid from APPLIED only.
   */
  markInterviewing(): void {
    if (this.#props.status !== JobStatus.APPLIED) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.INTERVIEWING);
    }
    this.#props.status = JobStatus.INTERVIEWING;
  }

  /**
   * User received an offer.
   * Valid from APPLIED or INTERVIEWING.
   */
  markOffered(): void {
    const allowed = [JobStatus.APPLIED, JobStatus.INTERVIEWING];
    if (!allowed.includes(this.#props.status)) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.OFFERED);
    }
    this.#props.status = JobStatus.OFFERED;
  }

  /**
   * Company rejected the application.
   * Valid from APPLIED or INTERVIEWING.
   */
  markRejected(): void {
    const allowed = [JobStatus.APPLIED, JobStatus.INTERVIEWING];
    if (!allowed.includes(this.#props.status)) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.REJECTED);
    }
    this.#props.status = JobStatus.REJECTED;
  }

  /**
   * User withdrew their application.
   * Valid from APPLIED or INTERVIEWING.
   */
  withdraw(): void {
    const allowed = [JobStatus.APPLIED, JobStatus.INTERVIEWING];
    if (!allowed.includes(this.#props.status)) {
      throw new InvalidJobTransitionException(this.#props.status, JobStatus.WITHDRAWN);
    }
    this.#props.status = JobStatus.WITHDRAWN;
  }

  /**
   * Update free-text notes on the job.
   */
  updateNotes(notes: string): void {
    this.#props.notes = notes;
  }
}
