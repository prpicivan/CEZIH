/*
  Warnings:

  - A unique constraint covering the columns `[skId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "skId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "skSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "InvoiceBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cezihBatchId" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atcCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TherapyRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "duration" TEXT,
    "note" TEXT,
    "cezihId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TherapyRecommendation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TherapyRecommendation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TherapyRecommendation_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CezihMessage" (
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
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    CONSTRAINT "Invoice_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InvoiceBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "appointmentId", "cezihInvoiceId", "createdAt", "id", "referralId", "sentAt", "status") SELECT "amount", "appointmentId", "cezihInvoiceId", "createdAt", "id", "referralId", "sentAt", "status" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_referralId_key" ON "Invoice"("referralId");
CREATE UNIQUE INDEX "Invoice_appointmentId_key" ON "Invoice"("appointmentId");
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mbo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "hasSupplemental" BOOLEAN NOT NULL DEFAULT false,
    "policyStatus" TEXT,
    "insuranceCategory" TEXT,
    "weaponHolder" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Patient" ("birthDate", "createdAt", "firstName", "id", "lastName", "mbo") SELECT "birthDate", "createdAt", "firstName", "id", "lastName", "mbo" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_mbo_key" ON "Patient"("mbo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceBatch_cezihBatchId_key" ON "InvoiceBatch"("cezihBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_atcCode_key" ON "Medicine"("atcCode");

-- CreateIndex
CREATE UNIQUE INDEX "TherapyRecommendation_cezihId_key" ON "TherapyRecommendation"("cezihId");

-- CreateIndex
CREATE INDEX "CezihMessage_status_idx" ON "CezihMessage"("status");

-- CreateIndex
CREATE INDEX "CezihMessage_patientMbo_idx" ON "CezihMessage"("patientMbo");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_skId_key" ON "Appointment"("skId");
