
import { cezihService } from '../services/cezih.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('G9 Certification - Specialist Outpatient Care (SKZZ)', () => {

    beforeAll(async () => {
        // Clear registries and seed
        await prisma.cezihRegistry.deleteMany();
        await prisma.cezihRegistry.createMany({
            data: [
                { type: 'MKB-10', code: 'R10.4', name: 'Abdominal pain', active: true },
                { type: 'SPECIALTY', code: '2020202', name: 'Radiology', active: true }
            ]
        });
    });

    test('SCENARIO 1: Patient Insurance Status Lookup', async () => {
        const status = await cezihService.checkInsuranceStatus('123456789');
        expect(status.valid).toBe(true);
        expect(status.status).toBe('AO');
    });

    test('SCENARIO 2: eReferral Atomic Takeover (POLB_IN990029)', async () => {
        // 1. Create a mock referral in SENT state
        const referral = await prisma.referral.create({
            data: {
                cezihReferralId: 'TEST-REF-001',
                patientMbo: '123456789',
                patientName: 'Test Patient',
                diagnosisCode: 'R10.4',
                procedureCode: '2020202',
                targetDepartment: 'Radiology',
                status: 'SENT',
                patientId: (await prisma.patient.findFirst())?.id || 'mock-id'
            }
        });

        // 2. Perform Takeover
        const result = await cezihService.takeoverReferral('TEST-REF-001', 'DR-TEST', 'ORG-TEST');
        expect(result.success).toBe(true);
        expect(result.referral.isTakenOver).toBe(true);
        expect(result.referral.status).toBe('ACCEPTED');

        // 3. Attempt second takeover - Should Fail
        await expect(
            cezihService.takeoverReferral('TEST-REF-001', 'DR-OTHER', 'ORG-OTHER')
        ).rejects.toThrow('Referral already taken over');
    });

    test('SCENARIO 3: Storno Mechanism (FICR_IN990101)', async () => {
        const result = await cezihService.stornoFinding('NAL-12345', 'REASON_ERR');
        expect(result.success).toBe(true);
        expect(result.message).toContain('successfully cancelled (STORNO)');
    });

    test('SCENARIO 4: Code Validation (Standardized Registries)', async () => {
        // Valid code
        const entry = await cezihService.validateCode('R10.4', 'MKB-10');
        expect(entry.code).toBe('R10.4');

        // Invalid code
        await expect(
            cezihService.validateCode('INVALID-001', 'MKB-10')
        ).rejects.toThrow('Invalid or inactive CEZIH code');
    });

    test('SCENARIO 5: Realizacija uputnice - Slanje nalaza bez privitka', async () => {
        // 1. Setup Data - Appointment without document
        const patient = await prisma.patient.create({
            data: {
                mbo: '999000999',
                firstName: 'Bez',
                lastName: 'Dokumenta',
                birthDate: new Date()
            }
        });

        const appt = await prisma.appointment.create({
            data: {
                patientId: patient.id,
                startTime: new Date(),
                endTime: new Date(),
                status: 'COMPLETED'
            }
        });

        const finding = await prisma.clinicalFinding.create({
            data: {
                appointmentId: appt.id,
                anamnesis: 'Test Anamnesis',
                statusPraesens: 'Test Status',
                therapy: 'Test Therapy',
                // No document attached
            }
        });

        // 2. Execute Send Finding
        const result = await cezihService.sendFinding(finding);

        // 3. Verify Success & Audit Log (that it was sent without binary)
        expect(result.success).toBe(true);
        expect(result.message).toContain('successfully sent');

        // Check if DB updated
        const updatedFinding = await prisma.clinicalFinding.findUnique({ where: { id: finding.id } });
        expect(updatedFinding?.cezihFindingId).toBe(result.cezihId);

        // Verify Audit Log Payload doesn't contain Base64 block
        const log = await prisma.cezihMessage.findFirst({
            where: { type: 'SEND_FINDING', direction: 'OUTGOING', status: 'SENT' },
            orderBy: { createdAt: 'desc' }
        });

        expect(log).toBeDefined();
        // Should NOT contain <nonXMLBody>
        expect(log?.payload).not.toContain('<nonXMLBody>');
        // Should contain structured text
        expect(log?.payload).toContain('Anamneza: Test Anamnesis');
    });
});
