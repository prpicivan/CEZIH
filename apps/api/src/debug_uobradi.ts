import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mbo = '235879641';
    console.log(`Checking status for MBO: ${mbo}`);

    const patient = await prisma.patient.findUnique({
        where: { mbo },
        include: {
            referrals: {
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            appointments: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    if (!patient) {
        console.log('Patient not found');
        return;
    }

    console.log('--- Patient Data ---');
    console.log(`MBO: ${patient.mbo}`);

    const referral = patient.referrals[0];
    if (referral) {
        console.log('\n--- Latest Referral ---');
        console.log(`ID: ${referral.id}`);
        console.log(`CEZIH ID: ${referral.cezihReferralId}`);
        console.log(`Status: ${referral.status}`);
        console.log(`Is Taken Over: ${referral.isTakenOver}`);
        console.log(`Takeover Time: ${referral.takeoverTime}`);
    }

    const apt = patient.appointments[0];
    if (apt) {
        console.log('\n--- Latest Appointment ---');
        console.log(`ID: ${apt.id}`);
        console.log(`Status: ${apt.status}`);
        console.log(`Sync Time: ${apt.skSyncedAt}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
