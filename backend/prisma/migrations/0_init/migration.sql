-- Baseline of the schema that existed before the plant journal (prisma/baseline.prisma).
--
-- Fresh installs: applied by `prisma migrate deploy` like any other migration.
-- Existing databases that already contain this schema (created before migrations were
-- versioned): do NOT run this script. Record it instead with
--   npx prisma migrate resolve --applied 0_init
-- once you have verified that the database matches prisma/baseline.prisma.

-- CreateEnum
CREATE TYPE "GeneticType" AS ENUM ('INDICA', 'SATIVA', 'HYBRID');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "GrowType" AS ENUM ('INDOOR', 'OUTDOOR', 'GREENHOUSE');

-- CreateEnum
CREATE TYPE "GrowMethod" AS ENUM ('SOIL', 'HYDROPONIC', 'AEROPONIC');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GrowPhase" AS ENUM ('GERMINATION', 'VEGETATIVE', 'FLOWERING', 'FLUSH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genetics" "GeneticType" NOT NULL,
    "floweringWeeks" INTEGER NOT NULL,
    "yieldEstimate" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "climateSuitability" TEXT NOT NULL,
    "description" TEXT,
    "thcContent" DOUBLE PRECISION,
    "cbdContent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "growType" "GrowType" NOT NULL,
    "growMethod" "GrowMethod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPhase" "GrowPhase" NOT NULL DEFAULT 'GERMINATION',
    "userId" TEXT NOT NULL,
    "strainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "phase" "GrowPhase" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "growProjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowLog" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "photoUrl" TEXT,
    "ph" DOUBLE PRECISION,
    "ec" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "growProjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutrientPlan" (
    "id" TEXT NOT NULL,
    "phase" "GrowPhase" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "targetPh" DOUBLE PRECISION NOT NULL,
    "targetEc" DOUBLE PRECISION NOT NULL,
    "nitrogenRatio" DOUBLE PRECISION NOT NULL,
    "phosphorusRatio" DOUBLE PRECISION NOT NULL,
    "potassiumRatio" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "growProjectId" TEXT NOT NULL,

    CONSTRAINT "NutrientPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Strain_name_key" ON "Strain"("name");

-- AddForeignKey
ALTER TABLE "GrowProject" ADD CONSTRAINT "GrowProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowProject" ADD CONSTRAINT "GrowProject_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_growProjectId_fkey" FOREIGN KEY ("growProjectId") REFERENCES "GrowProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowLog" ADD CONSTRAINT "GrowLog_growProjectId_fkey" FOREIGN KEY ("growProjectId") REFERENCES "GrowProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutrientPlan" ADD CONSTRAINT "NutrientPlan_growProjectId_fkey" FOREIGN KEY ("growProjectId") REFERENCES "GrowProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
