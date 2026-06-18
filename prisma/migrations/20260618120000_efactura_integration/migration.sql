-- CreateEnum
CREATE TYPE "EfacturaStatus" AS ENUM ('not_submitted', 'submitted', 'accepted', 'rejected', 'error');

-- AlterTable Organization: adauga campuri necesare pentru emiterea facturilor catre ANAF
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "cif"               TEXT,
  ADD COLUMN IF NOT EXISTS "street"            TEXT,
  ADD COLUMN IF NOT EXISTS "city"              TEXT,
  ADD COLUMN IF NOT EXISTS "county"            TEXT,
  ADD COLUMN IF NOT EXISTS "iban"              TEXT,
  ADD COLUMN IF NOT EXISTS "bankName"          TEXT,
  ADD COLUMN IF NOT EXISTS "efacturaCompanyId" TEXT;

-- AlterTable Client: adauga campuri adresa pentru facturare B2B
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "cif"    TEXT,
  ADD COLUMN IF NOT EXISTS "street" TEXT,
  ADD COLUMN IF NOT EXISTS "city"   TEXT,
  ADD COLUMN IF NOT EXISTS "county" TEXT;

-- AlterTable Invoice: adauga campuri pentru integrarea cu e-factura-api
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "vatRate"             DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "items"               JSONB,
  ADD COLUMN IF NOT EXISTS "efacturaStatus"      "EfacturaStatus" NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS "efacturaUploadIndex" TEXT,
  ADD COLUMN IF NOT EXISTS "efacturaMessageId"   TEXT,
  ADD COLUMN IF NOT EXISTS "efacturaError"       TEXT;
