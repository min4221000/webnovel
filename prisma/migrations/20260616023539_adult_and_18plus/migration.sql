-- AlterTable
ALTER TABLE "Novel" ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adult" BOOLEAN NOT NULL DEFAULT false;
