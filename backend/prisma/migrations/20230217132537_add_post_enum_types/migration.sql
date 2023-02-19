-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('FUNNY', 'TECH', 'RANDOM', 'NEWS', 'SERIOUS');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'FUNNY';
