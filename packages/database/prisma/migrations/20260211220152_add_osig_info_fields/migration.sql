-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mbo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "hasSupplemental" BOOLEAN NOT NULL DEFAULT false,
    "policyStatus" TEXT,
    "policyNumber" TEXT,
    "validUntil" DATETIME,
    "insuranceCategory" TEXT,
    "gender" TEXT,
    "isVeteran" BOOLEAN NOT NULL DEFAULT false,
    "weaponHolder" BOOLEAN DEFAULT false,
    "isIsolated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Patient" ("birthDate", "createdAt", "firstName", "hasSupplemental", "id", "insuranceCategory", "lastName", "mbo", "policyStatus", "weaponHolder") SELECT "birthDate", "createdAt", "firstName", "hasSupplemental", "id", "insuranceCategory", "lastName", "mbo", "policyStatus", "weaponHolder" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_mbo_key" ON "Patient"("mbo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
