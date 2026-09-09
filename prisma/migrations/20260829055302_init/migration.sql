-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "rId" INTEGER NOT NULL,
    "steamId" INTEGER,
    "name" TEXT,
    "backgroundImage" TEXT,
    "dominantColor" TEXT,
    "releaseDate" TEXT,
    "ratingMetacritic" DOUBLE PRECISION,
    "ratingRawg" DOUBLE PRECISION,
    "pros" TEXT[],
    "cons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "reviewText" TEXT,
    "votesUp" INTEGER,
    "recommendationId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "remoteId" INTEGER,
    "image" TEXT,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL,
    "name" TEXT,
    "slug" TEXT,
    "language" TEXT,
    "gamesCount" INTEGER,
    "imageBackground" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTag" (
    "gameId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "GameTag_pkey" PRIMARY KEY ("gameId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_rId_key" ON "Game"("rId");

-- CreateIndex
CREATE INDEX "Game_updatedAt_id_idx" ON "Game"("updatedAt", "id");

-- CreateIndex
CREATE INDEX "Review_gameId_idx" ON "Review"("gameId");

-- CreateIndex
CREATE INDEX "Screenshot_gameId_idx" ON "Screenshot"("gameId");

-- CreateIndex
CREATE INDEX "GameTag_tagId_idx" ON "GameTag"("tagId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTag" ADD CONSTRAINT "GameTag_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTag" ADD CONSTRAINT "GameTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
