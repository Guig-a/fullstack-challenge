CREATE TABLE "rounds" (
  "id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "crashPointBasisPoints" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "crashedAt" TIMESTAMP(3),

  CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bets" (
  "id" UUID NOT NULL,
  "roundId" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" BIGINT NOT NULL,
  "status" TEXT NOT NULL,
  "cashoutMultiplierBasisPoints" BIGINT,
  "payoutCents" BIGINT,
  "placedAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),

  CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bets_roundId_userId_key" ON "bets"("roundId", "userId");
CREATE INDEX "bets_userId_idx" ON "bets"("userId");

ALTER TABLE "bets"
  ADD CONSTRAINT "bets_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "rounds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
