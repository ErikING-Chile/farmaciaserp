-- Create enums
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AlertRuleType" AS ENUM ('STOCK_MIN', 'EXPIRY_SOON');

-- Extend existing enums
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'PURCHASE_RECEIPT';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'RETURN';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'EXPIRY_WRITE_OFF';

ALTER TYPE "PurchaseStatus" ADD VALUE IF NOT EXISTS 'ISSUED';
ALTER TYPE "PurchaseStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PurchaseStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- Update ReceivingStatus enum values (safe for shadow DB)
CREATE TYPE "ReceivingStatus_new" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');

-- Quitar default antes de cambiar el tipo
ALTER TABLE "receivings" ALTER COLUMN "status" DROP DEFAULT;

-- Convertir el tipo mapeando valores antiguos -> nuevos (sin UPDATE previo)
ALTER TABLE "receivings"
ALTER COLUMN "status" TYPE "ReceivingStatus_new"
USING (
  CASE
    WHEN "status"::text IN ('PENDING', 'PARTIAL') THEN 'DRAFT'
    WHEN "status"::text = 'COMPLETE' THEN 'RECEIVED'
    ELSE 'CANCELLED'
  END
)::"ReceivingStatus_new";

-- Reemplazar enum viejo por el nuevo
DROP TYPE "ReceivingStatus";
ALTER TYPE "ReceivingStatus_new" RENAME TO "ReceivingStatus";

-- Restaurar default
ALTER TABLE "receivings" ALTER COLUMN "status" SET DEFAULT 'DRAFT';


-- Tenants
ALTER TABLE "tenants" ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "tenants" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'STARTER';

-- Branches
ALTER TABLE "branches" ADD COLUMN "city" TEXT;

-- Warehouses
ALTER TABLE "warehouses" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "warehouses" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Suppliers
ALTER TABLE "suppliers" ADD COLUMN "legalName" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "tradeName" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "giro" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE';

-- Purchase invoices
ALTER TABLE "purchase_invoices" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "purchase_invoices" ADD COLUMN "notes" TEXT;
ALTER TABLE "purchase_invoices" ADD COLUMN "branchId" TEXT;

UPDATE "purchase_invoices" SET "branchId" = (
  SELECT b."id" FROM "branches" b
  WHERE b."tenantId" = "purchase_invoices"."tenantId"
  ORDER BY b."createdAt" ASC
  LIMIT 1
) WHERE "branchId" IS NULL;

-- Purchase invoice items
ALTER TABLE "purchase_invoice_items" ADD COLUMN "taxRateId" TEXT;

-- Receivings
ALTER TABLE "receivings" ADD COLUMN "branchId" TEXT;
ALTER TABLE "receivings" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "receivings" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "receivings" ALTER COLUMN "invoiceId" DROP NOT NULL;

UPDATE "receivings" r
SET "supplierId" = pi."supplierId"
FROM "purchase_invoices" pi
WHERE r."invoiceId" = pi."id";

UPDATE "receivings" r
SET "branchId" = COALESCE(
  (SELECT pi."branchId" FROM "purchase_invoices" pi WHERE pi."id" = r."invoiceId"),
  (SELECT b."id" FROM "branches" b WHERE b."tenantId" = r."tenantId" ORDER BY b."createdAt" ASC LIMIT 1)
)
WHERE r."branchId" IS NULL;

UPDATE "receivings" r
SET "warehouseId" = (
  SELECT w."id" FROM "warehouses" w WHERE w."tenantId" = r."tenantId" ORDER BY w."createdAt" ASC LIMIT 1
)
WHERE r."warehouseId" IS NULL;

-- Receiving items
ALTER TABLE "receiving_items" ADD COLUMN "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Batches
ALTER TABLE "batches" ADD COLUMN "branchId" TEXT;
ALTER TABLE "batches" ADD COLUMN "warehouseId" TEXT;

UPDATE "batches" b
SET "branchId" = (
  SELECT br."id" FROM "branches" br WHERE br."tenantId" = b."tenantId" ORDER BY br."createdAt" ASC LIMIT 1
)
WHERE b."branchId" IS NULL;

UPDATE "batches" b
SET "warehouseId" = (
  SELECT w."id" FROM "warehouses" w WHERE w."tenantId" = b."tenantId" ORDER BY w."createdAt" ASC LIMIT 1
)
WHERE b."warehouseId" IS NULL;

-- Stock movements
ALTER TABLE "stock_movements" ADD COLUMN "qtyIn" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stock_movements" ADD COLUMN "qtyOut" INTEGER NOT NULL DEFAULT 0;
UPDATE "stock_movements" SET "qtyIn" = "quantity" WHERE "type" = 'IN';
UPDATE "stock_movements" SET "qtyOut" = "quantity" WHERE "type" = 'OUT';

-- New tables
CREATE TABLE "supplier_contacts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_terms" (
  "id" TEXT NOT NULL,
  "paymentTermDays" INTEGER NOT NULL DEFAULT 0,
  "creditLimit" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "defaultDiscountPct" DECIMAL(5,2),
  "notes" TEXT,
  "tenantId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_terms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tax_rates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rate" DECIMAL(5,2) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alert_rules" (
  "id" TEXT NOT NULL,
  "type" "AlertRuleType" NOT NULL,
  "params" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "tenantId" TEXT NOT NULL,
  "branchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- Constraints and indexes
ALTER TABLE "receivings" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "receivings" ALTER COLUMN "warehouseId" SET NOT NULL;
ALTER TABLE "receivings" ALTER COLUMN "supplierId" SET NOT NULL;
ALTER TABLE "batches" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "batches" ALTER COLUMN "warehouseId" SET NOT NULL;

DROP INDEX "batches_lotNumber_productId_tenantId_key";
CREATE UNIQUE INDEX "batches_lotNumber_productId_tenantId_branchId_warehouseId_key" ON "batches"("lotNumber", "productId", "tenantId", "branchId", "warehouseId");
CREATE UNIQUE INDEX "tax_rates_name_tenantId_key" ON "tax_rates"("name", "tenantId");
CREATE UNIQUE INDEX "supplier_terms_supplierId_key" ON "supplier_terms"("supplierId");

-- Foreign keys
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batches" ADD CONSTRAINT "batches_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_terms" ADD CONSTRAINT "supplier_terms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_terms" ADD CONSTRAINT "supplier_terms_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
