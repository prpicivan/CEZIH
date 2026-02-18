import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mbo = '235879641';
    const referralId = 'c1bf2f70-e132-4ebd-9469-a52ef7c12c77';
    const appointmentId = '2f0e0ff5-1bf9-4606-b7ef-70b9e5bf42cb';

    console.log(`Inserting missing SYNC_SK audit log for MBO: ${mbo}`);

    await (prisma as any).cezihMessage.create({
        data: {
            type: 'SYNC_SK',
            direction: 'OUTGOING',
            status: 'SENT',
            payload: JSON.stringify({ appointmentId, skId: 'SK-844941_FIXED' }),
            appointmentId: appointmentId,
            referralId: referralId,
            patientMbo: mbo
        }
    });

    console.log('✅ Audit log entry created.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
