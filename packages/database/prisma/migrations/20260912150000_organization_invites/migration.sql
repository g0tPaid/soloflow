-- Pending team invitations (token is stored hashed)
CREATE TABLE IF NOT EXISTS "organization_invites" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'EMPLOYEE',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_organizationId_email_key" ON "organization_invites"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "organization_invites_organizationId_idx" ON "organization_invites"("organizationId");
CREATE INDEX IF NOT EXISTS "organization_invites_email_idx" ON "organization_invites"("email");

DO $$ BEGIN
  ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
