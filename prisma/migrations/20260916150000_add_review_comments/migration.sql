-- CreateEnum
CREATE TYPE "CommentStance" AS ENUM ('POSITIVE', 'NEGATIVE', 'MIXED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "reviewCommentSummary" JSONB,
ADD COLUMN     "reviewCommentsUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" SERIAL NOT NULL,
    "videoGuideId" INTEGER NOT NULL,
    "youtubeCommentId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorChannelUrl" TEXT,
    "text" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "stance" "CommentStance" NOT NULL,
    "specificity" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoComment_youtubeCommentId_key" ON "VideoComment"("youtubeCommentId");

-- CreateIndex
CREATE INDEX "VideoComment_videoGuideId_idx" ON "VideoComment"("videoGuideId");

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_videoGuideId_fkey" FOREIGN KEY ("videoGuideId") REFERENCES "VideoGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

