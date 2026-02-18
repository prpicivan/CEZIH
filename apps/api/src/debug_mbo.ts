import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mbo = '235879641';
    console.log(`Searching for patient with MBO: ${mbo}`);

    const patient = await prisma.patient.findUnique({
        where: { mbo },
        include: {
            referrals: true,
            appointments: {
                include: {
                    referral: true
                }
            }
        }
    });

    if (!patient) {
        console.log('Patient not found.');
        return;
    }

    console.log('Patient Found:', patient.firstName, patient.lastName);
    console.log('--- Referrals ---');
    patient.referrals.forEach(ref => {
        console.log(`Ref ID: ${ref.id}, Status: ${ref.status}, Diagnosis: ${ref.diagnosisCode}`);
    });

    console.log('--- Appointments ---');
    patient.appointments.forEach(apt => {
        console.log(`Apt ID: ${apt.id}, Status: ${apt.status}, SK ID: ${apt.skId}, Referral ID: ${apt.referralId}`);
        if (apt.referral) {
            console.log(`  Linked Referral Status: ${apt.referral.status}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
