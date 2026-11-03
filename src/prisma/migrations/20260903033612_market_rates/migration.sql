-- CreateTable
CREATE TABLE "MarketSeries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fredId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "lastFetchedAt" DATETIME
);

-- CreateTable
CREATE TABLE "MarketObservation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "value" REAL NOT NULL,
    CONSTRAINT "MarketObservation_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "MarketSeries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketSeries_fredId_key" ON "MarketSeries"("fredId");

-- CreateIndex
CREATE INDEX "MarketObservation_seriesId_date_idx" ON "MarketObservation"("seriesId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MarketObservation_seriesId_date_key" ON "MarketObservation"("seriesId", "date");
