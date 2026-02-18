
import { cezihService } from './services/cezih.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('--- CEZIH Compliance Verification ---');

    try {
        // 1. Test HL7 Referral Generation
        console.log('\n[TEST 1] Sending referral...');
        const refResult = await cezihService.sendReferral({
            patientMbo: '123456789',
            patientName: 'Marko Marić',
            diagnosisCode: 'R10.4',
            procedureCode: '2020202',
            type: 'A1'
        });
        console.log('✔ Referral sent. ID:', refResult.id);

        // 2. Test Atomic Takeover
        console.log('\n[TEST 2] Performing takeover...');
        const takeResult = await cezihService.takeoverReferral(
            refResult.referral.cezihReferralId!,
            'DR-999',
            'HOSP-CENTRAL'
        );
        console.log('✔ Takeover successful. Status:', takeResult.referral.status);

        // 3. Test Code Validation
        console.log('\n[TEST 3] Validating MKB code...');
        const entry = await cezihService.validateCode('R10.4', 'MKB-10');
        console.log('✔ Code validated:', entry.name);

        console.log('\n--- VERIFICATION PASSED ---');
    } catch (error) {
        console.error('\n✖ VERIFICATION FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
