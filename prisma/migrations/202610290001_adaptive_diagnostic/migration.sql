CREATE TABLE "AdaptiveSession" (
 "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdaptiveSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdaptiveSession_tokenHash_key" ON "AdaptiveSession"("tokenHash");
CREATE TABLE "AdaptiveAttempt" (
 "id" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "roleId" TEXT NOT NULL,
 "bankVersion" TEXT NOT NULL, "policyVersion" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL, "evidence" JSONB NOT NULL, "selection" JSONB NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'in_progress',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
 CONSTRAINT "AdaptiveAttempt_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AdaptiveAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdaptiveSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AdaptiveAttempt_sessionId_key" ON "AdaptiveAttempt"("sessionId");
CREATE INDEX "AdaptiveAttempt_roleId_status_createdAt_idx" ON "AdaptiveAttempt"("roleId", "status", "createdAt");
