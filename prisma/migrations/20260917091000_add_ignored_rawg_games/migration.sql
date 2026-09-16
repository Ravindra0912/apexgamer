-- CreateTable
CREATE TABLE "IgnoredRawgGame" (
    "rId" INTEGER NOT NULL,
    "name" TEXT,
    "reason" TEXT NOT NULL,
    "steamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgnoredRawgGame_pkey" PRIMARY KEY ("rId")
);

