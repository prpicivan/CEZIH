import { Router } from 'express';
import prisma from '../db/prisma';
import { CezihService } from '../services/cezih.service';
import { convertToFHIR } from '../utils/fhir.utils';

const router = Router();
const cezihService = new CezihService();

// Unified Registry Search
/**
 * @swagger
 * components:
 *   schemas:
 *     RegistryItem:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Code of the item (MKB10, ATC, or generic)
 *         name:
 *           type: string
 *           description: Name or description of the item
 *         type:
 *           type: string
 *           description: Type of registry (e.g., DIAGNOSIS, MEDICINE)
 *     InternalReferral:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *         patientId:
 *           type: string
 *         procedureCode:
 *           type: string
 *         procedureName:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ISSUED, COMPLETED]
 * 
 * /registries/{type}:
 *   get:
 *     summary: Search unified registries
 *     description: Search across MKB10, Medicines, or general CEZIH registries
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Registry type (mkb10, meds, medicine, or other CEZIH types)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: List of registry items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RegistryItem'
 */
router.get('/registries/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { search } = req.query;
        const query = search ? String(search) : '';

        // Route to specialized tables or general registry
        let results = [];
        if (type.toLowerCase() === 'mkb10') {
            results = await (prisma as any).mkb10.findMany({
                where: query ? {
                    OR: [
                        { code: { contains: query } },
                        { name: { contains: query } }
                    ]
                } : {},
                take: 50
            });
        } else if (type.toLowerCase() === 'meds' || type.toLowerCase() === 'medicine') {
            results = await (prisma as any).medicine.findMany({
                where: query ? {
                    OR: [
                        { name: { contains: query } },
                        { genericName: { contains: query } },
                        { atcCode: { contains: query } }
                    ]
                } : {},
                take: 50
            });
        } else {
            results = await (prisma as any).cezihRegistry.findMany({
                where: {
                    type: type.toUpperCase(),
                    active: true,
                    OR: query ? [
                        { code: { contains: query } },
                        { name: { contains: query } }
                    ] : undefined
                },
                take: 100
            });
        }

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Registry search failed' });
    }
});

// Internal Referrals (Specialist-to-Specialist)
/**
 * @swagger
 * /internal-referrals:
 *   post:
 *     summary: Create an internal referral (Specialist-to-Specialist)
 *     description: Issues an internal referral. Blocks if original referral is type A1.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalReferralId
 *               - procedureCode
 *               - procedureName
 *             properties:
 *               type:
 *                 type: string
 *                 default: A2
 *               originalReferralId:
 *                 type: string
 *               procedureCode:
 *                 type: string
 *               procedureName:
 *                 type: string
 *               department:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Internal referral created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalReferral'
 *       403:
 *         description: Cannot issue internal referral for A1 type
 *       404:
 *         description: Original referral not found
 */
router.post('/internal-referrals', async (req, res) => {
    try {
        const { type, originalReferralId, procedureCode, procedureName, department, note } = req.body;

        const original = await prisma.referral.findUnique({
            where: { id: originalReferralId }
        });

        console.log('DEBUG COMPLIANCE: Original Referral:', original?.id, 'Type:', (original as any)?.type);

        if (!original) return res.status(404).json({ error: 'Original referral not found' });

        // CEZIH COMPLIANCE: Osnovom A1 vrste uputnice nije moguće izdati internu uputnicu
        if ((original as any).type === 'A1') {
            return res.status(403).json({
                error: 'BLOCK: A1 referral detected. Specialist cannot issue internal referrals based on A1 consultative referral.'
            });
        }

        // Update original referral status if it's still ACTIVE (D1/A1 case)
        if (original.status === 'ACTIVE') {
            await prisma.referral.update({
                where: { id: originalReferralId },
                data: { status: 'U OBRADI' }
            });
        }

        const internalRef = await (prisma as any).internalReferral.create({
            data: {
                type,
                patientId: original.patientId,
                originalReferralId,
                procedureCode,
                procedureName,
                diagnosisCode: original.diagnosisCode,
                diagnosisName: original.diagnosisName,
                department,
                note,
                status: 'ISSUED'
            }
        });

        // Automatic Appointment Creation (Pending)
        const start = new Date();
        start.setDate(start.getDate() + 7); // Suggesting 7 days in the future
        start.setHours(10, 0, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 20);

        await (prisma as any).appointment.create({
            data: {
                patientId: original.patientId,
                internalReferralId: internalRef.id,
                startTime: start,
                endTime: end,
                status: 'pending'
            }
        });

        res.json(internalRef);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to create internal referral' });
    }
});

/**
 * @swagger
 * /internal-referrals/{referralId}:
 *   get:
 *     summary: Get internal referrals for a specific referral
 *     parameters:
 *       - in: path
 *         name: referralId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of internal referrals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InternalReferral'
 */
router.get('/internal-referrals/:referralId', async (req, res) => {
    try {
        const results = await (prisma as any).internalReferral.findMany({
            where: { originalReferralId: req.params.referralId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch internal referrals' });
    }
});

// Insurance check endpoint
/**
 * @swagger
 * /cezih/messages:
 *   get:
 *     summary: Get CEZIH messages
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get('/cezih/messages', async (req, res) => {
    try {
        const messages = await cezihService.getCezihMessages();
        res.json(messages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /cezih/insurance/{mbo}:
 *   get:
 *     summary: Check insurance status for MBO
 *     parameters:
 *       - in: path
 *         name: mbo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Insurance status
 */
router.get('/cezih/insurance/:mbo', async (req, res) => {
    try {
        const { mbo } = req.params;
        const insuranceStatus = await cezihService.checkInsuranceStatus(mbo);
        res.json(insuranceStatus);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to check insurance' });
    }
});

// Get guidelines for ordering control
/**
 * @swagger
 * /cezih/guidelines:
 *   get:
 *     summary: Get guidelines for ordering control
 *     parameters:
 *       - in: query
 *         name: mkb
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: procedure
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guidelines
 */
router.get('/cezih/guidelines', async (req, res) => {
    try {
        const { mkb, procedure } = req.query;
        if (!mkb || !procedure) {
            return res.status(400).json({ error: 'mkb and procedure are required' });
        }
        const guidelines = await cezihService.getGuidelines(mkb as string, procedure as string);
        res.json(guidelines);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch guidelines' });
    }
});

// Get referrals for patient
/**
 * @swagger
 * /referrals/patient/{mbo}:
 *   get:
 *     summary: Get referrals for a patient
 *     parameters:
 *       - in: path
 *         name: mbo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: dept
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of referrals
 */
router.get('/referrals/patient/:mbo', async (req, res) => {
    try {
        const { mbo } = req.params;
        const { dept } = req.query;
        console.log('Searching referrals for MBO:', mbo, 'Dept Filter:', dept, '[UNIQUE_TAG_V2]');

        // Query actual database instead of mock CEZIH service
        const where: any = { patientMbo: mbo };
        if (dept && dept !== 'ALL') {
            where.targetDepartment = dept;
        }

        const referrals = await prisma.referral.findMany({
            where,
            include: {
                patient: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(referrals);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch referrals' });
    }
});

// Create and send referral
/**
 * @swagger
 * /referrals:
 *   post:
 *     summary: Create and send a referral
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientMbo
 *               - patientName
 *               - diagnosisCode
 *               - procedureCode
 *               - targetDepartment
 *             properties:
 *               type:
 *                 type: string
 *                 default: A1
 *               patientMbo:
 *                 type: string
 *               patientName:
 *                 type: string
 *               diagnosisCode:
 *                 type: string
 *               diagnosisName:
 *                 type: string
 *               procedureCode:
 *                 type: string
 *               procedureName:
 *                 type: string
 *               targetDepartment:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral created
 */
router.post('/referrals', async (req, res) => {
    try {
        const referralData = req.body;
        const type = referralData.type || 'A1';

        // Find or create patient
        let patient = await prisma.patient.findUnique({
            where: { mbo: referralData.patientMbo }
        });

        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    mbo: referralData.patientMbo,
                    firstName: referralData.patientName.split(' ')[0],
                    lastName: referralData.patientName.split(' ').slice(1).join(' '),
                    birthDate: new Date(referralData.birthDate || '1990-01-01'),
                }
            });
        }

        // 1. Save to local database (PENDING)
        console.log('DB: Creating referral record for patient:', patient.id);
        const referral = await prisma.referral.create({
            data: {
                patientId: patient.id,
                cezihReferralId: 'PENDING-' + Date.now(),
                patientMbo: referralData.patientMbo,
                patientName: referralData.patientName,
                diagnosisCode: referralData.diagnosisCode,
                diagnosisName: referralData.diagnosisName,
                procedureCode: referralData.procedureCode,
                procedureName: referralData.procedureName,
                targetDepartment: referralData.targetDepartment,
                note: referralData.note,
                status: 'PENDING',
                type: type
            }
        });

        // 2. Send to CEZIH (Pass DB ID for logging)
        const cezihResult = await cezihService.sendReferral(referralData, referral.id);

        // 3. Update Referral Status
        await prisma.referral.update({
            where: { id: referral.id },
            data: {
                status: 'POSLANA',
                cezihReferralId: cezihResult.id
            }
        });

        console.log('DB: Referral created and sent successfully:', referral.id);
        res.json({ success: true, id: referral.id, cezihId: cezihResult.id });
    } catch (error: any) {
        console.error('CRITICAL ERROR: Failed to create referral:', error);
        res.status(500).json({ error: error.message || 'Failed to create referral' });
    }
});

// Get all appointments
/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Get all appointments
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/appointments', async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                patient: true,
                referral: {
                    include: {
                        cezihMessages: true
                    }
                },
                clinicalFinding: true,
                invoices: true,
                recommendations: {
                    include: {
                        medicine: true
                    }
                }
            },
            orderBy: { startTime: 'asc' }
        });
        res.json(appointments);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch appointments' });
    }
});

// SK Connectivity Check (Level 2)
/**
 * @swagger
 * /appointments/sk/status:
 *   get:
 *     summary: Check Central Calendar (SK) connectivity
 *     responses:
 *       200:
 *         description: SK status (Level 2 check)
 */
router.get('/appointments/sk/status', async (req, res) => {
    try {
        const status = await cezihService.checkSkConnectivity();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to check SK status' });
    }
});

// SK Sync (Level 3)
/**
 * @swagger
 * /appointments/{id}/sync:
 *   post:
 *     summary: Sync appointment with Central Calendar (Level 3)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sync result
 */
router.post('/appointments/:id/sync', async (req, res) => {
    try {
        const result = await cezihService.syncWithCentralCalendar(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to sync with SK' });
    }
});

// Create appointment
/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Create an appointment
 *     description: Creates an appointment. Checks insurance status first (OsigInfo).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientMbo
 *               - startTime
 *               - endTime
 *             properties:
 *               patientMbo:
 *                 type: string
 *               referralId:
 *                 type: string
 *                 description: Optional referral ID to link
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Appointment created
 *       403:
 *         description: Insurance inactive block
 */
router.post('/appointments', async (req, res) => {
    try {
        const { patientMbo, referralId, startTime, endTime } = req.body;

        console.log('=== APPOINTMENT CREATION REQUEST ===');
        console.log('patientMbo:', patientMbo, 'type:', typeof patientMbo, 'length:', patientMbo?.length);
        console.log('referralId:', referralId, 'type:', typeof referralId);
        console.log('startTime:', startTime);
        console.log('endTime:', endTime);

        if (!patientMbo) {
            return res.status(400).json({ error: 'Patient MBO is required' });
        }

        // 1. Compliance: Check Insurance Status (OsigInfo)
        const insurance = await cezihService.getExtendedInsurance(patientMbo);
        if (insurance.policyStatus === 'INACTIVE') {
            return res.status(403).json({
                error: 'BLOCK: Appointment creation rejected. Patient insurance is INACTIVE.',
                details: insurance
            });
        }

        // Find or create patient by MBO
        let patient = await prisma.patient.findUnique({
            where: { mbo: patientMbo }
        });

        if (!patient) {
            // Create a basic patient record
            patient = await (prisma.patient as any).create({
                data: {
                    mbo: patientMbo,
                    firstName: insurance.firstName || 'Unknown',
                    lastName: insurance.lastName || 'Patient',
                    birthDate: new Date(insurance.birthDate || '1990-01-01'),
                    gender: insurance.gender,
                    policyStatus: insurance.policyStatus,
                    insuranceCategory: insurance.insuranceCategory,
                    hasSupplemental: insurance.hasSupplemental
                }
            });
        }

        // Convert empty string to null for referralId
        const validReferralId = referralId && referralId.trim() !== '' ? referralId : null;

        // 2. Prepare Snapshot Data from Referral (if linked)
        let referralSnapshot: any = {};
        if (validReferralId) {
            const sourceReferral = await prisma.referral.findUnique({
                where: { id: validReferralId }
            });

            if (sourceReferral) {
                // Format: "CODE | NAME" for easy display where applicable
                referralSnapshot = {
                    referralDiagnosis: `${sourceReferral.diagnosisCode} | ${sourceReferral.diagnosisName || ''}`,
                    referralProcedure: `${sourceReferral.procedureCode} | ${sourceReferral.procedureName || ''}`,
                    referralType: sourceReferral.type,
                    referralNote: sourceReferral.note
                };
            }
        }

        const appointment = await (prisma.appointment as any).create({
            data: {
                patientId: patient!.id,
                referralId: validReferralId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                status: 'scheduled',
                // Persistence: Store insurance snapshot at time of booking
                insuranceStatus: insurance.policyStatus,
                insuranceCategory: insurance.insuranceCategory,
                hasSupplemental: insurance.hasSupplemental,
                // Persistence: Store referral snapshot
                ...referralSnapshot
            },
            include: {
                patient: true,
                referral: true,
            }
        });

        res.json(appointment);
    } catch (error: any) {
        console.error('Appointment creation error:', error);
        res.status(500).json({ error: error.message || 'Failed to create appointment' });
    }
});

// Update appointment status
/**
 * @swagger
 * /appointments/{id}:
 *   patch:
 *     summary: Update appointment status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, cancelled, pending]
 *     responses:
 *       200:
 *         description: Appointment updated
 */
router.patch('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status },
            include: {
                patient: true,
                referral: true,
            }
        });

        // CEZIH COMPLIANCE: If appointment is completed, mark referral as U OBRADI (In Treatment)
        if (status === 'completed' && appointment.referralId) {
            try {
                const doctorId = process.env.SIFRA_LIJECNIKA || 'DR-UNKNOWN';
                const orgId = process.env.KOD_USTANOVE || 'ORG-UNKNOWN';
                console.log(`CEZIH: Appointment completed. Triggering takeover (U OBRADI) for referral ${appointment.referralId}`);
                await cezihService.takeoverReferral(appointment.referralId, doctorId, orgId);
            } catch (cezihError: any) {
                console.error('CEZIH Auto-Takeover Error (Non-blocking):', cezihError.message);
            }
        }

        res.json(appointment);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update appointment' });
    }
});

// Cancel appointment and revert referral status
// Delete appointment (Physical delete)
/**
 * @swagger
 * /appointments/{id}:
 *   delete:
 *     summary: Delete appointment (Physical delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment deleted
 */
router.delete('/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.appointment.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Appointment deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to delete appointment' });
    }
});

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   post:
 *     summary: Cancel appointment
 *     description: Cancels appointment and reverts linked referral to POSLANA
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled and referral reverted
 */
router.post('/appointments/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: { referral: true }
        });

        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        // Update appointment status to cancelled
        const updated = await prisma.appointment.update({
            where: { id },
            data: { status: 'cancelled' }
        });

        // CEZIH COMPLIANCE: If appointment has a referral, revert its status to POSLANA
        if (appointment.referralId) {
            console.log(`CEZIH: Reverting referral ${appointment.referralId} status to POSLANA due to cancellation`);
            await cezihService.releaseReservation(appointment.referralId);
        }

        res.json({ success: true, appointment: updated });
    } catch (error: any) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({ error: error.message || 'Failed to cancel appointment' });
    }
});

// Dashboard - Get all referrals with status
/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get dashboard data
 *     parameters:
 *       - in: query
 *         name: dept
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data (Referrals with status)
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { dept } = req.query;
        const where: any = {};

        if (dept && dept !== 'ALL') {
            where.targetDepartment = dept;
        }

        const referrals = await prisma.referral.findMany({
            where,
            include: {
                patient: true,
                invoices: true,
                appointments: {
                    include: {
                        clinicalFinding: true
                    }
                },
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`DASHBOARD: Returning ${referrals.length} referrals (Filtered by: ${dept || 'ALL'})`);
        res.json(referrals);
    } catch (error: any) {
        console.error('DASHBOARD ERROR:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch dashboard data' });
    }
});

// Appointment Invoicing
/**
 * @swagger
 * /appointments/{id}/invoice:
 *   post:
 *     summary: Issue invoice for appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice issued
 */
router.post('/appointments/:id/invoice', async (req, res) => {
    try {
        const result = await cezihService.issueAppointmentInvoices(req.params.id);
        res.json(result);
    } catch (error: any) {
        console.error('INVOICE ERROR:', error);
        res.status(500).json({ error: error.message || 'Failed to issue appointment invoices' });
    }
});

// HZZO Unified Registries Fetch
router.get('/registries/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const results = await prisma.cezihRegistry.findMany({
            where: { type: type.toUpperCase(), active: true },
            orderBy: { code: 'asc' }
        });
        res.json(results);
    } catch (error: any) {
        console.error('REGISTRY FETCH ERROR:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch registry' });
    }
});

// MKB-10 Codebook search
/**
 * @swagger
 * /codebooks/mkb10:
 *   get:
 *     summary: Search MKB-10 codebook
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of MKB-10 codes
 */
router.get('/codebooks/mkb10', async (req, res) => {
    try {
        const { search } = req.query;
        const query = search ? String(search) : '';

        const codes = await (prisma as any).mkb10.findMany({
            where: query ? {
                OR: [
                    { code: { contains: query } },
                    { name: { contains: query } }
                ]
            } : {},
            orderBy: { code: 'asc' },
            take: 50 // Limit results for performance
        });

        res.json(codes);
    } catch (error: any) {
        console.error('MKB-10 SEARCH ERROR:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch codes' });
    }
});

// Blue Book Procedures search
/**
 * @swagger
 * /codebooks/procedures:
 *   get:
 *     summary: Search procedures codebook (Blue Book)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of procedures
 */
router.get('/codebooks/procedures', async (req, res) => {
    try {
        const { search } = req.query;

        // HZZO Activity codebook (Djelatnosti u ZZ)
        const mockProcedures = [
            { code: '100201', name: 'Ponovni pregled doktora medicine specijaliste' },
            { code: '100200', name: 'Prvi pregled doktora medicine specijaliste' },
            { code: '200100', name: 'USG abdomena' },
            { code: '300150', name: 'RTG pluća' },
            { code: '2050000', name: 'Fizikalna medicina i rehabilitacija (Zapisnik Case 1)' },
            { code: '100000', name: 'Opća medicina' },
        ];

        const filtered = search
            ? mockProcedures.filter(p =>
                p.code.includes(search.toString()) ||
                p.name.toLowerCase().includes(search.toString().toLowerCase())
            )
            : mockProcedures;

        res.json(filtered);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch procedures' });
    }
});

// Insurance Categories Codebook
/**
 * @swagger
 * /codebooks/insurance-categories:
 *   get:
 *     summary: Get insurance categories
 *     responses:
 *       200:
 *         description: List of insurance categories
 */
router.get('/codebooks/insurance-categories', async (req, res) => {
    try {
        const categories = [
            { code: 'AO', name: 'Aktivno Osnovno' },
            { code: 'AD', name: 'Aktivno Dopunsko' },
            { code: 'HB', name: 'Hrvatski Branitelj' },
            { code: 'VO', name: 'Vlasnik Oružja' },
            { code: 'IC', name: 'Izolacija' },
        ];
        res.json(categories);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch categories' });
    }
});

// Clinical Findings - Create
/**
 * @swagger
 * /findings:
 *   post:
 *     summary: Create clinical finding
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - anamnesis
 *               - statusPraesens
 *               - therapy
 *             properties:
 *               appointmentId:
 *                 type: string
 *               anamnesis:
 *                 type: string
 *               statusPraesens:
 *                 type: string
 *               therapy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Finding created
 */
router.post('/findings', async (req, res) => {
    try {
        const { appointmentId, anamnesis, statusPraesens, therapy } = req.body;

        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { patient: true }
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (appointment.status !== 'completed') {
            return res.status(400).json({ error: 'Appointment must be completed' });
        }

        // Compliance: Block duplicate creation unless it's an unsigned correction
        const existingFinding = await prisma.clinicalFinding.findUnique({
            where: { appointmentId }
        });

        if (existingFinding && existingFinding.signedAt) {
            return res.status(400).json({ error: 'Signed clinical finding already exists. Perform Storno first to edit.' });
        }

        const finding = await (prisma.clinicalFinding as any).upsert({
            where: { appointmentId },
            update: { anamnesis, statusPraesens, therapy },
            create: { appointmentId, anamnesis, statusPraesens, therapy },
            include: { appointment: { include: { patient: true, referral: true } } }
        });

        res.json(finding);
    } catch (error: any) {
        console.error('Finding creation error:', error);
        res.status(500).json({ error: error.message || 'Failed to create finding' });
    }
});

// Clinical Findings - Send to CEZIH
/**
 * @swagger
 * /findings/{id}/send:
 *   post:
 *     summary: Send finding to CEZIH
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Finding sent to CEZIH and referral realized
 */
router.post('/findings/:id/send', async (req, res) => {
    try {
        const { id } = req.params;

        const finding = await prisma.clinicalFinding.findUnique({
            where: { id },
            include: { appointment: { include: { patient: true } } }
        });

        if (!finding) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        const cezihResult = await cezihService.sendFinding({
            id: finding.id,
            patientMbo: finding.appointment.patient.mbo,
            anamnesis: finding.anamnesis,
            statusPraesens: finding.statusPraesens,
            therapy: finding.therapy
        });

        const updatedFinding = await prisma.clinicalFinding.update({
            where: { id },
            data: { cezihFindingId: cezihResult.cezihId, signedAt: new Date() },
            include: { appointment: { include: { referral: true } } }
        });

        // CEZIH COMPLIANCE: If finding is sent, mark referral as REALIZIRANA (Realized)
        if (updatedFinding.appointment?.referralId) {
            try {
                console.log(`CEZIH: Finding sent. Triggering realization (REALIZIRANA) for referral ${updatedFinding.appointment.referralId}`);
                await cezihService.realizeReferral(updatedFinding.appointment.referralId, updatedFinding.id);
            } catch (cezihError: any) {
                console.error('CRITICAL: CEZIH Auto-Realization Failed:', cezihError);
                // We should probably throw here or alert someone, but for now we log loudly
            }
        }

        res.json({ success: true, finding: updatedFinding, cezihId: cezihResult.cezihId });
    } catch (error: any) {
        console.error('Send finding error:', error);
        res.status(500).json({ error: error.message || 'Failed to sync with SK' });
    }
});

// Clinical Findings - Storno
/**
 * @swagger
 * /findings/{id}/storno:
 *   post:
 *     summary: Storno clinical finding
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Finding cancelled
 */
router.post('/findings/:id/storno', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason required' });
        }

        const finding = await prisma.clinicalFinding.findUnique({ where: { id } });

        if (!finding) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        if (!finding.cezihFindingId) {
            return res.status(400).json({ error: 'Finding not sent to CEZIH' });
        }

        const stornoResult = await cezihService.stornoFinding(finding.cezihFindingId, reason);
        await prisma.clinicalFinding.delete({ where: { id } });

        res.json({ success: true, message: stornoResult.message });
    } catch (error: any) {
        console.error('Storno finding error:', error);
        res.status(500).json({ error: error.message || 'Failed to storno finding' });
    }
});

// Clinical Findings - Get FHIR JSON
/**
 * @swagger
 * /findings/{id}/fhir:
 *   get:
 *     summary: Get FHIR JSON for finding
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FHIR JSON
 */
router.get('/findings/:id/fhir', async (req, res) => {
    try {
        const { id } = req.params;

        const finding = await prisma.clinicalFinding.findUnique({
            where: { id },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        referral: true
                    }
                }
            }
        });

        if (!finding) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        const fhirFinding = convertToFHIR(finding);
        res.json(fhirFinding);
    } catch (error: any) {
        console.error('FHIR conversion error:', error);
        res.status(500).json({ error: error.message || 'Failed to convert to FHIR' });
    }
});

// Invoices - Issue New Invoice
/**
 * @swagger
 * /invoices/issue:
 *   post:
 *     summary: Issue new invoice
 *     description: Issue invoice handled by CezihService PDSF logic
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referralId
 *             properties:
 *               referralId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice issued
 */
router.post('/invoices/issue', async (req, res) => {
    try {
        const { referralId } = req.body;

        if (!referralId) {
            return res.status(400).json({ error: 'Referral ID is required' });
        }

        // Use CezihService to handle PDSF insurance logic & Audit logging
        const result = await cezihService.issueInvoice(referralId);
        res.json(result);
    } catch (error: any) {
        console.error('Issue invoice error:', error);
        res.status(500).json({ error: error.message || 'Failed to issue invoice' });
    }
});

// Invoices - Batch Processing
/**
 * @swagger
 * /invoices/batch:
 *   post:
 *     summary: Process batch invoices
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceIds
 *             properties:
 *               invoiceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               batchType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch processed
 */
router.post('/invoices/batch', async (req, res) => {
    try {
        const { invoiceIds, batchType } = req.body;
        if (!invoiceIds || !Array.isArray(invoiceIds)) {
            return res.status(400).json({ error: 'invoiceIds array is required' });
        }

        const result = await cezihService.sendBatchInvoices(invoiceIds, batchType);
        res.json(result);
    } catch (error: any) {
        console.error('Batch invoice error:', error);
        res.status(500).json({ error: error.message || 'Failed to process batch' });
    }
});

// Invoices - Statistics/Reporting
/**
 * @swagger
 * /invoices/stats:
 *   get:
 *     summary: Get invoice statistics
 *     responses:
 *       200:
 *         description: Invoice statistics
 */
router.get('/invoices/stats', async (req, res) => {
    try {
        const stats = await prisma.invoice.groupBy({
            by: ['status'],
            _count: true,
            _sum: { amount: true }
        });
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch stats' });
    }
});

// Registries - Invoices & Errors
/**
 * @swagger
 * /registries/billing:
 *   get:
 *     summary: Get billing registries
 *     responses:
 *       200:
 *         description: Billing registries
 */
router.get('/registries/billing', async (req, res) => {
    try {
        const registries = await prisma.cezihRegistry.findMany({
            where: {
                type: { in: ['INVOICE_TYPE', 'ERROR_CODE'] }
            }
        });
        res.json(registries);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch registries' });
    }
});

// Extended Insurance Lookup (OsigInfo)
router.get('/insurance/extended/:mbo', async (req, res) => {
    try {
        const { mbo } = req.params;
        const result = await cezihService.getExtendedInsurance(mbo);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to fetch extended insurance' });
    }
});

router.post('/insurance/update/:mbo', async (req, res) => {
    try {
        const { mbo } = req.params;
        const result = await cezihService.updatePatientData(mbo, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update patient data' });
    }
});

// Medication Search (Legacy shortcut - maintained for backwards compatibility)
router.get('/medication/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        const result = await cezihService.searchMedication(q.toString());
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to search medication' });
    }
});

// Therapy Recommendation
router.post('/medication/recommendation', async (req, res) => {
    try {
        const { appointmentId } = req.body;

        // CEZIH COMPLIANCE: Osnovom A1 vrste uputnice nije moguće izdati preporuku o kontrolnim pregledima/terapiji
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { referral: true }
        });

        if (appointment?.referral?.type === 'A1') {
            return res.status(403).json({
                error: 'BLOCK: A1 referral detected. Specialist cannot issue therapy recommendations/prescriptions based on A1 consultative referral.'
            });
        }

        const result = await cezihService.issueTherapyRecommendation(req.body);
        res.json(result);
    } catch (error: any) {
        console.error('Therapy recommendation error:', error);
        res.status(500).json({ error: error.message || 'Failed to issue recommendation' });
    }
});

// HZZO Batch Report Download
router.get('/invoices/batch/:id/report', async (req, res) => {
    try {
        const report = await cezihService.generateHzzoBatchReport(req.params.id);
        res.setHeader('Content-Type', 'text/xml');
        res.setHeader('Content-Disposition', `attachment; filename=${report.filename}`);
        res.send(report.content);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to generate report' });
    }
});

// Printable Findings
router.get('/findings/:id/print', async (req, res) => {
    try {
        const data = await cezihService.getPrintableFinding(req.params.id);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Clinical Finding - ${data.patientName}</title>
    <style>
        body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
        .header { border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 10px; }
        .inst { font-weight: bold; font-size: 1.2em; }
        .patient-box { background: #f4f4f4; padding: 15px; margin-bottom: 30px; }
        .finding-body { white-space: pre-wrap; margin-bottom: 50px; }
        .footer { margin-top: 50px; display: flex; justify-content: space-between; }
        .sign { border-top: 1px solid #333; padding-top: 5px; width: 200px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="inst">${data.institution}</div>
        <div>Timestamp: ${new Date(data.timestamp).toLocaleString()}</div>
    </div>
    
    <div class="patient-box">
        <div><strong>PATIENT:</strong> ${data.patientName}</div>
        <div><strong>MBO:</strong> ${data.mbo}</div>
        <div><strong>DIAGNOSIS:</strong> ${data.diagnosis}</div>
        <div><strong>REFERRAL ID:</strong> ${data.referralId || 'DIRECT'}</div>
    </div>
    
    <h2>CLINICAL FINDING</h2>
    <div class="finding-body">${data.findingBody}</div>
    
    <div class="footer">
        <div>Generated by WBS Test</div>
        <div class="sign">
            <strong>${data.doctorName}</strong><br/>
            Electronic Signature Certified
        </div>
    </div>
    
    <script>window.print();</script>
</body>
</html>`;
        res.send(html);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to get printable finding' });
    }
});

// Storno Mechanism
router.post('/cezih/storno/:id', async (req, res) => {
    try {
        const { type } = req.body;
        const result = await cezihService.stornoDocument(req.params.id, type);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Storno failed' });
    }
});

export default router;
