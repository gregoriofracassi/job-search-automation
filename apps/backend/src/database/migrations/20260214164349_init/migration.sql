-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'EVALUATED', 'SAVED', 'APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "easyApply" BOOLEAN NOT NULL DEFAULT false,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyUrl" TEXT,
    "companyLogoUrl" TEXT,
    "location" TEXT NOT NULL,
    "seniorityLevel" TEXT,
    "employmentType" TEXT,
    "jobFunction" TEXT,
    "industries" TEXT,
    "jobDescription" TEXT NOT NULL,
    "jobDescriptionHtml" TEXT NOT NULL,
    "timePosted" TEXT,
    "numApplicants" TEXT,
    "salaryRange" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapeKeywords" TEXT,
    "scrapeLocation" TEXT,
    "score" INTEGER,
    "scoreReasoning" TEXT,
    "scoreCriteria" JSONB,
    "scoredAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'NEW',
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobId_key" ON "Job"("jobId");
