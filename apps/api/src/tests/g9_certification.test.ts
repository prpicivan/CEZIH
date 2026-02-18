
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
});
