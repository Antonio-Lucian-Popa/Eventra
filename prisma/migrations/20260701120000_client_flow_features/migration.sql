-- Roluri noi cerute de client: sales (Vanzari) si worker (Lucrator).
-- Pastram manager/staff pentru compatibilitate cu datele existente.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'worker';

-- Status nou de eveniment: preconfirmed (preconfirmarea din calendar, afisata cu rosu in FE).
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'preconfirmed';

-- Event: campuri pentru fluxul de preconfirmare (alocare loc + termen limita).
ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "preconfirmedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "preconfirmExpiresAt" TIMESTAMP(3);

-- Contract: semnatura electronica salvata direct in aplicatie.
ALTER TABLE "Contract"
  ADD COLUMN IF NOT EXISTS "signatureData" TEXT,
  ADD COLUMN IF NOT EXISTS "signerName"    TEXT,
  ADD COLUMN IF NOT EXISTS "signerIp"      TEXT;

-- DeviceToken: token-uri de push pentru aplicatia mobila a lucratorilor.
CREATE TABLE IF NOT EXISTS "DeviceToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "platform"  TEXT NOT NULL DEFAULT 'expo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx" ON "DeviceToken"("userId");

ALTER TABLE "DeviceToken"
  ADD CONSTRAINT "DeviceToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
