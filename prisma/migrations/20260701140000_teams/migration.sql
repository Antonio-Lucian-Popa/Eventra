-- Echipe de lucratori: fiecare echipa are un responsabil (lead) care coordoneaza
-- restul membrilor. Evenimentul primeste o echipa (nu oameni individuali).

CREATE TABLE IF NOT EXISTS "Team" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "leadId"         TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "deletedAt"      TIMESTAMP(3),
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Team_organizationId_idx" ON "Team"("organizationId");

-- User: apartenenta la o echipa (membership).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- Event: echipa alocata sa lucreze la eveniment.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "teamId" TEXT;

-- Foreign keys
ALTER TABLE "Team"
  ADD CONSTRAINT "Team_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
