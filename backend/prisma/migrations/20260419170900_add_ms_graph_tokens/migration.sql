-- AlterTable
ALTER TABLE "User" ADD COLUMN "msGraphAccessToken" TEXT,
ADD COLUMN "msGraphRefreshToken" TEXT,
ADD COLUMN "msGraphTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Email" ADD COLUMN "messageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");
