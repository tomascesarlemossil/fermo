-- CreateEnum
CREATE TYPE "ProductionStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ProductionEventType" AS ENUM ('START', 'PRODUCE', 'PAUSE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "QualityResult" AS ENUM ('PASS', 'PARTIAL', 'FAIL');

-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "ProductionStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "sector" TEXT NOT NULL,
    "status" "ProductionStepStatus" NOT NULL DEFAULT 'PENDING',
    "qtyTarget" INTEGER NOT NULL,
    "qtyDone" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "stepId" TEXT,
    "type" "ProductionEventType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "operator" TEXT,
    "note" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "stepId" TEXT,
    "inspector" TEXT,
    "result" "QualityResult" NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "approvedQty" INTEGER NOT NULL DEFAULT 0,
    "rejectedQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityDefect" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "severity" "DefectSeverity" NOT NULL DEFAULT 'LOW',

    CONSTRAINT "QualityDefect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionStep_tenantId_idx" ON "ProductionStep"("tenantId");

-- CreateIndex
CREATE INDEX "ProductionStep_productionOrderId_idx" ON "ProductionStep"("productionOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionStep_productionOrderId_sequence_key" ON "ProductionStep"("productionOrderId", "sequence");

-- CreateIndex
CREATE INDEX "ProductionEvent_tenantId_idx" ON "ProductionEvent"("tenantId");

-- CreateIndex
CREATE INDEX "ProductionEvent_productionOrderId_idx" ON "ProductionEvent"("productionOrderId");

-- CreateIndex
CREATE INDEX "QualityInspection_tenantId_idx" ON "QualityInspection"("tenantId");

-- CreateIndex
CREATE INDEX "QualityInspection_productionOrderId_idx" ON "QualityInspection"("productionOrderId");

-- CreateIndex
CREATE INDEX "QualityDefect_tenantId_idx" ON "QualityDefect"("tenantId");

-- CreateIndex
CREATE INDEX "QualityDefect_inspectionId_idx" ON "QualityDefect"("inspectionId");

-- AddForeignKey
ALTER TABLE "ProductionStep" ADD CONSTRAINT "ProductionStep_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionStep" ADD CONSTRAINT "ProductionStep_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionEvent" ADD CONSTRAINT "ProductionEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProductionStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDefect" ADD CONSTRAINT "QualityDefect_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDefect" ADD CONSTRAINT "QualityDefect_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "QualityInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
