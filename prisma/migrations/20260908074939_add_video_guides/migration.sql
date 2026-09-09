-- CreateEnum
CREATE TYPE "VideoGuideCategory" AS ENUM ('REVIEW', 'BEFORE_YOU_BUY');

-- CreateTable
CREATE TABLE "VideoGuide" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelName" TEXT,
    "thumbnail" TEXT,
    "category" "VideoGuideCategory" NOT NULL,
    "aiSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoGuide_youtubeId_key" ON "VideoGuide"("youtubeId");

-- CreateIndex
CREATE INDEX "VideoGuide_gameId_idx" ON "VideoGuide"("gameId");

-- AddForeignKey
ALTER TABLE "VideoGuide" ADD CONSTRAINT "VideoGuide_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
