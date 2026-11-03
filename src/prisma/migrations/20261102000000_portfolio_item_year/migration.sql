-- The year each project's work was done, shown with the project.
ALTER TABLE "PortfolioItem" ADD COLUMN "year" INTEGER;

-- Years for the existing items, from the creation dates of each project's Illustrator
-- files (and the first commit, for code-only projects). Items that aren't in the
-- database are skipped by the WHERE clause, so this is safe on a fresh database too.
UPDATE "PortfolioItem" SET "year" = 2019 WHERE "projectId" = 'fantasyteamadvice';
UPDATE "PortfolioItem" SET "year" = 2016 WHERE "projectId" = 'dropzio';
UPDATE "PortfolioItem" SET "year" = 2013 WHERE "projectId" = 'silverlineMedia';
UPDATE "PortfolioItem" SET "year" = 2016 WHERE "projectId" = 'carvell';
UPDATE "PortfolioItem" SET "year" = 2009 WHERE "projectId" = 'flightswitch';
UPDATE "PortfolioItem" SET "year" = 2016 WHERE "projectId" = 'grillerzpub';
UPDATE "PortfolioItem" SET "year" = 2016 WHERE "projectId" = 'knightmoves';
UPDATE "PortfolioItem" SET "year" = 2012 WHERE "projectId" = 'sunshinetreefarm';
UPDATE "PortfolioItem" SET "year" = 2015 WHERE "projectId" = 'alchemistlabs';
UPDATE "PortfolioItem" SET "year" = 2016 WHERE "projectId" = 'yodel';
UPDATE "PortfolioItem" SET "year" = 2013 WHERE "projectId" = 'jamfactory';
UPDATE "PortfolioItem" SET "year" = 2014 WHERE "projectId" = 'revmatek';
UPDATE "PortfolioItem" SET "year" = 2013 WHERE "projectId" = 'familyhomehealth';
UPDATE "PortfolioItem" SET "year" = 2014 WHERE "projectId" = 'purplerstateproductions';
UPDATE "PortfolioItem" SET "year" = 2011 WHERE "projectId" = 'risingsun';
UPDATE "PortfolioItem" SET "year" = 2012 WHERE "projectId" = 'teneotalent';
UPDATE "PortfolioItem" SET "year" = 2013 WHERE "projectId" = 'propermotion';
UPDATE "PortfolioItem" SET "year" = 2020 WHERE "projectId" = 'crafthealth';
UPDATE "PortfolioItem" SET "year" = 2015 WHERE "projectId" = 'familyhospice';
UPDATE "PortfolioItem" SET "year" = 2013 WHERE "projectId" = 'moonwalkers';
UPDATE "PortfolioItem" SET "year" = 2012 WHERE "projectId" = 'absinthehouse';
UPDATE "PortfolioItem" SET "year" = 2026 WHERE "projectId" = 'kelldev-ai';
UPDATE "PortfolioItem" SET "year" = 2025 WHERE "projectId" = 'kelldev-clothing';
