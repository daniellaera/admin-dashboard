-- DropForeignKey
ALTER TABLE "ProgrammingLanguage" DROP CONSTRAINT "ProgrammingLanguage_profileId_fkey";

-- AddForeignKey
ALTER TABLE "ProgrammingLanguage" ADD CONSTRAINT "ProgrammingLanguage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
