/*
  Warnings:

  - A unique constraint covering the columns `[type,code]` on the table `CezihRegistry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointmentId,medicineId]` on the table `TherapyRecommendation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CezihRegistry_code_key";

-- CreateTable
CREATE TABLE "InternalReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "originalReferralId" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "diagnosisCode" TEXT,
    "diagnosisName" TEXT,
    "department" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalReferral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InternalReferral_originalReferralId_fkey" FOREIGN KEY ("originalReferralId") REFERENCES "Referral" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mkb10" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FiscalizationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "businessSpace" TEXT,
    "paymentDevice" TEXT,
    "status" TEXT NOT NULL,
    "requestXml" TEXT NOT NULL,
    "zki" TEXT,
    "responseXml" TEXT,
    "jir" TEXT,
    "errors" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT,
    CONSTRAINT "FiscalizationLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "referralId" TEXT,
    "internalReferralId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "skSyncedAt" DATETIME,
    "skId" TEXT,
    "insuranceStatus" TEXT,
    "insuranceCategory" TEXT,
    "hasSupplemental" BOOLEAN DEFAULT false,
    "referralDiagnosis" TEXT,
    "referralProcedure" TEXT,
    "referralType" TEXT,
    "referralNote" TEXT,
    CONSTRAINT "Appointment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_internalReferralId_fkey" FOREIGN KEY ("internalReferralId") REFERENCES "InternalReferral" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "endTime", "id", "patientId", "referralId", "skId", "skSyncedAt", "startTime", "status", "updatedAt") SELECT "createdAt", "endTime", "id", "patientId", "referralId", "skId", "skSyncedAt", "startTime", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_skId_key" ON "Appointment"("skId");
CREATE TABLE "new_CezihMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "response" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" DATETIME,
    "referralId" TEXT,
    "appointmentId" TEXT,
    "invoiceId" TEXT,
    "patientMbo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CezihMessage_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CezihMessage" ("appointmentId", "createdAt", "direction", "errorMessage", "id", "invoiceId", "lastAttemptAt", "maxRetries", "patientMbo", "payload", "referralId", "response", "retryCount", "status", "type", "updatedAt") SELECT "appointmentId", "createdAt", "direction", "errorMessage", "id", "invoiceId", "lastAttemptAt", "maxRetries", "patientMbo", "payload", "referralId", "response", "retryCount", "status", "type", "updatedAt" FROM "CezihMessage";
DROP TABLE "CezihMessage";
ALTER TABLE "new_CezihMessage" RENAME TO "CezihMessage";
CREATE INDEX "CezihMessage_status_idx" ON "CezihMessage"("status");
CREATE INDEX "CezihMessage_patientMbo_idx" ON "CezihMessage"("patientMbo");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT,
    "appointmentId" TEXT,
    "batchId" TEXT,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SKZZ',
    "status" TEXT NOT NULL,
    "cezihInvoiceId" TEXT,
    "errorCode" TEXT,
    "payer" TEXT NOT NULL DEFAULT 'HZZO',
    "payerName" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "Invoice_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InvoiceBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "appointmentId", "batchId", "cezihInvoiceId", "createdAt", "errorCode", "id", "referralId", "sentAt", "status", "type") SELECT "amount", "appointmentId", "batchId", "cezihInvoiceId", "createdAt", "errorCode", "id", "referralId", "sentAt", "status", "type" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE TABLE "new_Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atcCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "manufacturer" TEXT NOT NULL,
    "isSupplemental" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Medicine" ("active", "atcCode", "id", "manufacturer", "name") SELECT "active", "atcCode", "id", "manufacturer", "name" FROM "Medicine";
DROP TABLE "Medicine";
ALTER TABLE "new_Medicine" RENAME TO "Medicine";
CREATE UNIQUE INDEX "Medicine_atcCode_key" ON "Medicine"("atcCode");
CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");
CREATE INDEX "Medicine_genericName_idx" ON "Medicine"("genericName");
CREATE INDEX "Medicine_atcCode_idx" ON "Medicine"("atcCode");
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
    "type" TEXT NOT NULL DEFAULT 'A1',
    "note" TEXT,
    "status" TEXT NOT NULL,
    "isTakenOver" BOOLEAN NOT NULL DEFAULT false,
    "takenOverBy" TEXT,
    "takeoverTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realizedAt" DATETIME,
    CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Referral" ("cezihReferralId", "createdAt", "diagnosisCode", "diagnosisName", "id", "isTakenOver", "note", "patientId", "patientMbo", "patientName", "procedureCode", "procedureName", "realizedAt", "status", "takenOverBy", "takeoverTime", "targetDepartment") SELECT "cezihReferralId", "createdAt", "diagnosisCode", "diagnosisName", "id", "isTakenOver", "note", "patientId", "patientMbo", "patientName", "procedureCode", "procedureName", "realizedAt", "status", "takenOverBy", "takeoverTime", "targetDepartment" FROM "Referral";
DROP TABLE "Referral";
ALTER TABLE "new_Referral" RENAME TO "Referral";
CREATE UNIQUE INDEX "Referral_cezihReferralId_key" ON "Referral"("cezihReferralId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Mkb10_code_key" ON "Mkb10"("code");

-- CreateIndex
CREATE INDEX "Mkb10_code_idx" ON "Mkb10"("code");

-- CreateIndex
CREATE INDEX "Mkb10_name_idx" ON "Mkb10"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalizationLog_uuid_key" ON "FiscalizationLog"("uuid");

-- CreateIndex
CREATE INDEX "FiscalizationLog_uuid_idx" ON "FiscalizationLog"("uuid");

-- CreateIndex
CREATE INDEX "FiscalizationLog_invoiceNumber_idx" ON "FiscalizationLog"("invoiceNumber");

-- CreateIndex
CREATE INDEX "FiscalizationLog_status_idx" ON "FiscalizationLog"("status");

-- CreateIndex
CREATE INDEX "FiscalizationLog_createdAt_idx" ON "FiscalizationLog"("createdAt");

-- CreateIndex
CREATE INDEX "CezihRegistry_type_idx" ON "CezihRegistry"("type");

-- CreateIndex
CREATE INDEX "CezihRegistry_code_idx" ON "CezihRegistry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CezihRegistry_type_code_key" ON "CezihRegistry"("type", "code");

-- CreateIndex
CREATE UNIQUE INDEX "TherapyRecommendation_appointmentId_medicineId_key" ON "TherapyRecommendation"("appointmentId", "medicineId");
