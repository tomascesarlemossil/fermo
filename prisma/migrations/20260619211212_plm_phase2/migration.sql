-- CreateEnum
CREATE TYPE "BomComponentType" AS ENUM ('MATERIAL', 'PRODUCT');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "costPerUnit" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "attributes" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechSheet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechSheetVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "techSheetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechSheetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "BomComponentType" NOT NULL,
    "componentMaterialId" TEXT,
    "componentProductId" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_tenantId_idx" ON "Material"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_tenantId_code_key" ON "Material"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_tenantId_sku_key" ON "ProductVariant"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "TechSheet_tenantId_idx" ON "TechSheet"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TechSheet_tenantId_productId_key" ON "TechSheet"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "TechSheetVersion_tenantId_idx" ON "TechSheetVersion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TechSheetVersion_techSheetId_version_key" ON "TechSheetVersion"("techSheetId", "version");

-- CreateIndex
CREATE INDEX "BomItem_tenantId_idx" ON "BomItem"("tenantId");

-- CreateIndex
CREATE INDEX "BomItem_productId_idx" ON "BomItem"("productId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSheet" ADD CONSTRAINT "TechSheet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSheet" ADD CONSTRAINT "TechSheet_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSheetVersion" ADD CONSTRAINT "TechSheetVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechSheetVersion" ADD CONSTRAINT "TechSheetVersion_techSheetId_fkey" FOREIGN KEY ("techSheetId") REFERENCES "TechSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_componentMaterialId_fkey" FOREIGN KEY ("componentMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomItem" ADD CONSTRAINT "BomItem_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
