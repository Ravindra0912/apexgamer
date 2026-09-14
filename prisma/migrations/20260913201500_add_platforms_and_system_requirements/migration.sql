-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "platforms" TEXT[],
ADD COLUMN     "requirementsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "systemRequirements" JSONB;
