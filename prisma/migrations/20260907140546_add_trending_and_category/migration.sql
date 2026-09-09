-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('AAA', 'INDIE', 'UNCLASSIFIED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "addedCount" INTEGER,
ADD COLUMN     "category" "GameCategory" NOT NULL DEFAULT 'UNCLASSIFIED',
ADD COLUMN     "igdbPopularity" DOUBLE PRECISION,
ADD COLUMN     "popularityUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "steamCcu" INTEGER,
ADD COLUMN     "steamOwnersLabel" TEXT,
ADD COLUMN     "trendingScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Game_trendingScore_id_idx" ON "Game"("trendingScore", "id");

-- CreateIndex
CREATE INDEX "Game_addedCount_id_idx" ON "Game"("addedCount", "id");
