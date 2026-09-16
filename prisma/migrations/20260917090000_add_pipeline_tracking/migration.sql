-- CreateEnum
CREATE TYPE "PipelineRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "rawgSyncedAt" TIMESTAMP(3),
ADD COLUMN     "steamReviewsSyncedAt" TIMESTAMP(3),
ADD COLUMN     "videoGuidesCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VideoGuide" ADD COLUMN     "metadataRefreshedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "PipelineRunStatus" NOT NULL DEFAULT 'RUNNING',
    "stats" JSONB,
    "youtubeUnitsUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

