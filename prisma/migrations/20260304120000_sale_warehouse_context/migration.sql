-- Sale warehouse context foundation for multi-branch/multi-warehouse POS

-- 1) Add nullable column first to allow safe backfill.
ALTER TABLE "sales" ADD COLUMN "warehouseId" TEXT;

-- 2) Backfill from existing SALE stock movements when available.
UPDATE "sales" s
SET "warehouseId" = sm."warehouseId"
FROM LATERAL (
  SELECT m."warehouseId"
  FROM "stock_movements" m
  WHERE m."refType" = 'SALE'
    AND m."refId" = s."id"
    AND m."tenantId" = s."tenantId"
  ORDER BY m."createdAt" ASC
  LIMIT 1
) sm
WHERE s."warehouseId" IS NULL;

-- 3) Fallback to branch-preferred/default warehouse by tenant.
UPDATE "sales" s
SET "warehouseId" = w."id"
FROM LATERAL (
  SELECT ww."id"
  FROM "warehouses" ww
  WHERE ww."tenantId" = s."tenantId"
    AND (ww."branchId" = s."branchId" OR ww."branchId" IS NULL)
  ORDER BY
    CASE WHEN ww."branchId" = s."branchId" THEN 0 ELSE 1 END,
    CASE WHEN ww."isDefault" THEN 0 ELSE 1 END,
    ww."createdAt" ASC
  LIMIT 1
) w
WHERE s."warehouseId" IS NULL;

-- 4) Create deterministic backfill warehouses for unresolved tenant/branch pairs.
--    This keeps migration non-destructive and auditable for manual review later.
INSERT INTO "warehouses" (
  "id",
  "name",
  "type",
  "isDefault",
  "isActive",
  "tenantId",
  "branchId",
  "createdAt",
  "updatedAt"
)
SELECT
  'auto-wh-sales-backfill-' || s."tenantId" || '-' || COALESCE(s."branchId", 'global') AS "id",
  'AUTO_BACKFILL_SALES_' || s."tenantId" || '_' || COALESCE(s."branchId", 'GLOBAL') AS "name",
  'MAIN'::"WarehouseType" AS "type",
  false AS "isDefault",
  true AS "isActive",
  s."tenantId",
  s."branchId",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "sales" s
WHERE s."warehouseId" IS NULL
GROUP BY s."tenantId", s."branchId"
ON CONFLICT ("id") DO NOTHING;

-- 5) Assign unresolved sales to deterministic backfill warehouse.
UPDATE "sales" s
SET "warehouseId" = w."id"
FROM "warehouses" w
WHERE s."warehouseId" IS NULL
  AND w."id" = 'auto-wh-sales-backfill-' || s."tenantId" || '-' || COALESCE(s."branchId", 'global')
  AND w."tenantId" = s."tenantId";

-- 6) Fail fast if any sale still has no warehouse mapping.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "sales" WHERE "warehouseId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill failed: sales without warehouseId remain';
  END IF;
END $$;

-- 7) Enforce relation and query indexes.
ALTER TABLE "sales" ALTER COLUMN "warehouseId" SET NOT NULL;

ALTER TABLE "sales"
ADD CONSTRAINT "sales_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "sales_tenantId_branchId_warehouseId_soldAt_idx"
ON "sales"("tenantId", "branchId", "warehouseId", "soldAt");

CREATE INDEX IF NOT EXISTS "batches_tenantId_branchId_warehouseId_productId_expirationDate_remainingQty_idx"
ON "batches"("tenantId", "branchId", "warehouseId", "productId", "expirationDate", "remainingQty");

CREATE INDEX IF NOT EXISTS "stock_movements_tenantId_branchId_warehouseId_productId_createdAt_idx"
ON "stock_movements"("tenantId", "branchId", "warehouseId", "productId", "createdAt");
