-- CreateTable
CREATE TABLE "CezihRegistry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cezihReferralId" TEXT,
    "patientId" TEXT NOT NULL,
    "patientMbo" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "diagnosisCode" TEXT NOT NULL,
    "diagnosisName" TEXT,
    "procedureCode" TEXT NOT NULL,
    "procedureName" TEXT,
    "targetDepartment" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "isTakenOver" BOOLEAN NOT NULL DEFAULT false,
    "takenOverBy" TEXT,
    "takeoverTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realizedAt" DATETIME,
    CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Referral" ("cezihReferralId", "createdAt", "diagnosisCode", "diagnosisName", "id", "note", "patientId", "patientMbo", "patientName", "procedureCode", "procedureName", "realizedAt", "status", "targetDepartment") SELECT "cezihReferralId", "createdAt", "diagnosisCode", "diagnosisName", "id", "note", "patientId", "patientMbo", "patientName", "procedureCode", "procedureName", "realizedAt", "status", "targetDepartment" FROM "Referral";
DROP TABLE "Referral";
ALTER TABLE "new_Referral" RENAME TO "Referral";
CREATE UNIQUE INDEX "Referral_cezihReferralId_key" ON "Referral"("cezihReferralId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CezihRegistry_code_key" ON "CezihRegistry"("code");
