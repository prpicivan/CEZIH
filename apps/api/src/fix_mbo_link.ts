import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mbo = '235879641';
    const referralId = 'c1bf2f70-e132-4ebd-9469-a52ef7c12c77';
    const appointmentId = '2f0e0ff5-1bf9-4606-b7ef-70b9e5bf42cb';

    console.log(`Fixing data for MBO: ${mbo}`);

    // 1. Link referral to appointment
    await prisma.appointment.update({
        where: { id: appointmentId },
        data: { referralId: referralId }
    });
    console.log(`✅ Linked Appointment ${appointmentId} to Referral ${referralId}`);

    // 2. Transition referral status to REZERVIRANA (since appointment is already SK synced/confirmed)
    await prisma.referral.update({
        where: { id: referralId },
        data: { status: 'REZERVIRANA' }
    });
    console.log(`✅ Transitioned Referral ${referralId} status to REZERVIRANA`);

    // Verify final state
    const updatedReferral = await prisma.referral.findUnique({ where: { id: referralId } });
    console.log('Final Referral Status:', updatedReferral?.status);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
