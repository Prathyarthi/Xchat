-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('ROMANTIC', 'BESTIE', 'MENTOR', 'SUPPORT');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "relationshipType" "RelationshipType" NOT NULL DEFAULT 'BESTIE';
