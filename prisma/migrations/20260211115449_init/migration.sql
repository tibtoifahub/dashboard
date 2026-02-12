-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'REGION');

-- CreateEnum
CREATE TYPE "Profession" AS ENUM ('DOCTOR', 'NURSE');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('PASSED', 'FAILED', 'NO_SHOW_1', 'NO_SHOW_2');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "regionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalBrigade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalBrigade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "pinfl" TEXT NOT NULL,
    "profession" "Profession" NOT NULL,
    "regionId" INTEGER NOT NULL,
    "brigadeId" INTEGER NOT NULL,
    "cert1" BOOLEAN NOT NULL DEFAULT false,
    "cert2" BOOLEAN NOT NULL DEFAULT false,
    "cert3" BOOLEAN NOT NULL DEFAULT false,
    "cert4" BOOLEAN NOT NULL DEFAULT false,
    "cert1Note" TEXT,
    "cert2Note" TEXT,
    "cert3Note" TEXT,
    "cert4Note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleResult" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "status" "ModuleStatus" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "isRetake" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_pinfl_key" ON "Candidate"("pinfl");

-- CreateIndex
CREATE INDEX "Candidate_regionId_profession_idx" ON "Candidate"("regionId", "profession");

-- CreateIndex
CREATE INDEX "Candidate_brigadeId_idx" ON "Candidate"("brigadeId");

-- CreateIndex
CREATE INDEX "ModuleResult_candidateId_moduleNumber_idx" ON "ModuleResult"("candidateId", "moduleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleResult_candidateId_moduleNumber_attemptNumber_key" ON "ModuleResult"("candidateId", "moduleNumber", "attemptNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalBrigade" ADD CONSTRAINT "MedicalBrigade_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_brigadeId_fkey" FOREIGN KEY ("brigadeId") REFERENCES "MedicalBrigade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleResult" ADD CONSTRAINT "ModuleResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
