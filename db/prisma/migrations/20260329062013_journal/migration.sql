-- CreateTable
CREATE TABLE "JournalDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mood" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "journalDayId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "aiReflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalDay_userId_date_idx" ON "JournalDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDay_userId_date_key" ON "JournalDay"("userId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_journalDayId_createdAt_idx" ON "JournalEntry"("journalDayId", "createdAt");

-- AddForeignKey
ALTER TABLE "JournalDay" ADD CONSTRAINT "JournalDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_journalDayId_fkey" FOREIGN KEY ("journalDayId") REFERENCES "JournalDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
