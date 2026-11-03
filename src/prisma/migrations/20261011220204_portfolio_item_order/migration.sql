-- Orders portfolio items and each item's gallery. Hand-edited from the generated
-- migration so that no data is lost and nothing visibly moves:
--   * PortfolioItemImage replaces the implicit _PortfolioItemToProjectImage join, and
--     its rows are copied across first. Positions follow image id, which is the order
--     the implicit relation returned, so every gallery keeps its current order.
--   * sortOrder starts as the item's id, the order portfolioItems returned until now.

-- CreateTable
CREATE TABLE "PortfolioItemImage" (
    "portfolioItemId" INTEGER NOT NULL,
    "projectImageId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("portfolioItemId", "projectImageId"),
    CONSTRAINT "PortfolioItemImage_portfolioItemId_fkey" FOREIGN KEY ("portfolioItemId") REFERENCES "PortfolioItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioItemImage_projectImageId_fkey" FOREIGN KEY ("projectImageId") REFERENCES "ProjectImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy the existing gallery links, numbering each item's images from 0.
INSERT INTO "PortfolioItemImage" ("portfolioItemId", "projectImageId", "position")
SELECT "A", "B", ROW_NUMBER() OVER (PARTITION BY "A" ORDER BY "B") - 1
FROM "_PortfolioItemToProjectImage";

-- DropIndex
DROP INDEX "_PortfolioItemToProjectImage_B_index";

-- DropIndex
DROP INDEX "_PortfolioItemToProjectImage_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_PortfolioItemToProjectImage";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortfolioItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "homeImageId" INTEGER NOT NULL,
    "primaryImageId" INTEGER NOT NULL,
    CONSTRAINT "PortfolioItem_homeImageId_fkey" FOREIGN KEY ("homeImageId") REFERENCES "ProjectImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PortfolioItem_primaryImageId_fkey" FOREIGN KEY ("primaryImageId") REFERENCES "ProjectImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PortfolioItem" ("description", "homeImageId", "id", "name", "primaryImageId", "projectId", "sortOrder") SELECT "description", "homeImageId", "id", "name", "primaryImageId", "projectId", "id" FROM "PortfolioItem";
DROP TABLE "PortfolioItem";
ALTER TABLE "new_PortfolioItem" RENAME TO "PortfolioItem";
CREATE UNIQUE INDEX "PortfolioItem_projectId_key" ON "PortfolioItem"("projectId");
CREATE UNIQUE INDEX "PortfolioItem_name_key" ON "PortfolioItem"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "PortfolioItemImage_projectImageId_idx" ON "PortfolioItemImage"("projectImageId");
