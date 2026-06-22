-- CreateEnum
CREATE TYPE "ShoeModelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('GLB', 'THUMBNAIL', 'IMAGE', 'IMAGE_360', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "StudioOptionGroup" AS ENUM ('MATERIAL', 'COLOR', 'SOLE', 'INSOLE', 'LINING', 'LACE', 'EYELET', 'PACKAGING', 'FINISH', 'CUSTOMIZATION');

-- CreateEnum
CREATE TYPE "StudioPriceType" AS ENUM ('FIXED_PAIR', 'PERCENT', 'FIXED_DEV');

-- CreateEnum
CREATE TYPE "StudioProjectStatus" AS ENUM ('DRAFT', 'CONFIGURING', 'SAVED', 'QUOTE_GENERATED', 'WAITING_TECHNICAL_REVIEW', 'TECHNICALLY_APPROVED', 'TECHNICALLY_REJECTED', 'WAITING_CUSTOMER_APPROVAL', 'APPROVED', 'EXPIRED', 'CONVERTED_TO_ORDER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'BOLETO', 'CARD', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TechReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "ShoeCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audience" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeModel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "audience" TEXT,
    "construction" TEXT,
    "shape" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minQty" INTEGER NOT NULL DEFAULT 12,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 30,
    "badge" TEXT,
    "status" "ShoeModelStatus" NOT NULL DEFAULT 'PUBLISHED',
    "modelUrl" TEXT,
    "thumbnailUrl" TEXT,
    "editableMeshes" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoeModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeModelAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "url" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoeModelAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "group" "StudioOptionGroup" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceType" "StudioPriceType" NOT NULL DEFAULT 'FIXED_PAIR',
    "price" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "minQty" INTEGER NOT NULL DEFAULT 0,
    "colorHex" TEXT,
    "variant" TEXT,
    "materialId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceProfileVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolumeDiscount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileVersionId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "discountPct" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "VolumeDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "customerId" TEXT,
    "ownerEmail" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Meu projeto',
    "status" "StudioProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "selection" JSONB NOT NULL,
    "grade" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "brandAssetId" TEXT,
    "priceSnapshot" JSONB,
    "quoteId" TEXT,
    "orderId" TEXT,
    "publicToken" TEXT NOT NULL,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'LOGO',
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "orderId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'sandbox',
    "method" "PaymentMethod" NOT NULL DEFAULT 'PIX',
    "kind" TEXT NOT NULL DEFAULT 'DEPOSIT',
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "events" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "TechReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer" TEXT,
    "notes" TEXT,
    "costAdjustment" DECIMAL(12,2),
    "leadAdjustment" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoeCategory_tenantId_idx" ON "ShoeCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeCategory_tenantId_slug_key" ON "ShoeCategory"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ShoeModel_tenantId_idx" ON "ShoeModel"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeModel_tenantId_status_idx" ON "ShoeModel"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeModel_tenantId_slug_key" ON "ShoeModel"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ShoeModelAsset_tenantId_idx" ON "ShoeModelAsset"("tenantId");

-- CreateIndex
CREATE INDEX "ShoeModelAsset_modelId_idx" ON "ShoeModelAsset"("modelId");

-- CreateIndex
CREATE INDEX "StudioOption_tenantId_group_idx" ON "StudioOption"("tenantId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "StudioOption_tenantId_group_code_key" ON "StudioOption"("tenantId", "group", "code");

-- CreateIndex
CREATE INDEX "PriceProfile_tenantId_idx" ON "PriceProfile"("tenantId");

-- CreateIndex
CREATE INDEX "PriceProfileVersion_tenantId_idx" ON "PriceProfileVersion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceProfileVersion_profileId_version_key" ON "PriceProfileVersion"("profileId", "version");

-- CreateIndex
CREATE INDEX "VolumeDiscount_tenantId_idx" ON "VolumeDiscount"("tenantId");

-- CreateIndex
CREATE INDEX "VolumeDiscount_profileVersionId_idx" ON "VolumeDiscount"("profileVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioProject_publicToken_key" ON "StudioProject"("publicToken");

-- CreateIndex
CREATE INDEX "StudioProject_tenantId_idx" ON "StudioProject"("tenantId");

-- CreateIndex
CREATE INDEX "StudioProject_tenantId_status_idx" ON "StudioProject"("tenantId", "status");

-- CreateIndex
CREATE INDEX "BrandAsset_tenantId_idx" ON "BrandAsset"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioPayment_idempotencyKey_key" ON "StudioPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StudioPayment_tenantId_idx" ON "StudioPayment"("tenantId");

-- CreateIndex
CREATE INDEX "TechnicalReview_tenantId_idx" ON "TechnicalReview"("tenantId");

-- CreateIndex
CREATE INDEX "TechnicalReview_projectId_idx" ON "TechnicalReview"("projectId");

-- CreateIndex
CREATE INDEX "StudioEvent_tenantId_type_idx" ON "StudioEvent"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "ShoeCategory" ADD CONSTRAINT "ShoeCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeModel" ADD CONSTRAINT "ShoeModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeModel" ADD CONSTRAINT "ShoeModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShoeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeModelAsset" ADD CONSTRAINT "ShoeModelAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeModelAsset" ADD CONSTRAINT "ShoeModelAsset_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ShoeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioOption" ADD CONSTRAINT "StudioOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceProfile" ADD CONSTRAINT "PriceProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceProfileVersion" ADD CONSTRAINT "PriceProfileVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceProfileVersion" ADD CONSTRAINT "PriceProfileVersion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PriceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolumeDiscount" ADD CONSTRAINT "VolumeDiscount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolumeDiscount" ADD CONSTRAINT "VolumeDiscount_profileVersionId_fkey" FOREIGN KEY ("profileVersionId") REFERENCES "PriceProfileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioProject" ADD CONSTRAINT "StudioProject_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ShoeModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPayment" ADD CONSTRAINT "StudioPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalReview" ADD CONSTRAINT "TechnicalReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalReview" ADD CONSTRAINT "TechnicalReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEvent" ADD CONSTRAINT "StudioEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioEvent" ADD CONSTRAINT "StudioEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

