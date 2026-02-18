import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const patients = await prisma.patient.findMany({
        where: {
            policyStatus: 'ACTIVE',
            hasSupplemental: false
        }
    });

    console.log('Patients with ACTIVE insurance but NO Supplemental:');
    patients.forEach(p => {
        console.log(`MBO: ${p.mbo} | Name: ${p.firstName} ${p.lastName}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
