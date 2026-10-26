ALTER TYPE "GrowMethod" ADD VALUE IF NOT EXISTS 'COCO';

CREATE TABLE "Plant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "customStrain" TEXT,
  "growType" "GrowType" NOT NULL,
  "growMethod" "GrowMethod" NOT NULL,
  "currentPhase" "GrowPhase" NOT NULL DEFAULT 'GERMINATION',
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "strainId" TEXT,
  "growProjectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Plant_userId_createdAt_idx" ON "Plant"("userId","createdAt");
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_strainId_fkey" FOREIGN KEY ("strainId") REFERENCES "Strain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_growProjectId_fkey" FOREIGN KEY ("growProjectId") REFERENCES "GrowProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlantLog" (
  "id" TEXT NOT NULL,
  "plantId" TEXT NOT NULL,
  "notes" TEXT,
  "photoUrl" TEXT,
  "ph" DOUBLE PRECISION,
  "ec" DOUBLE PRECISION,
  "temperature" DOUBLE PRECISION,
  "humidity" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlantLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlantLog_plantId_createdAt_idx" ON "PlantLog"("plantId","createdAt");
ALTER TABLE "PlantLog" ADD CONSTRAINT "PlantLog_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
