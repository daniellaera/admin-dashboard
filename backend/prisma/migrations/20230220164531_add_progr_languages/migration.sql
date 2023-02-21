-- CreateTable
CREATE TABLE "ProgrammingLanguage" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,

    CONSTRAINT "ProgrammingLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammingLanguage_id_key" ON "ProgrammingLanguage"("id");

-- AddForeignKey
ALTER TABLE "ProgrammingLanguage" ADD CONSTRAINT "ProgrammingLanguage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
