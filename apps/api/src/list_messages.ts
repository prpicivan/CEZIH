import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const mbo = '235879641';
    console.log(`Listing all CEZIH messages for MBO: ${mbo}`);

    const messages = await (prisma as any).cezihMessage.findMany({
        where: { patientMbo: mbo },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${messages.length} messages.`);
    messages.forEach((m: any) => {
        console.log(`\n--- Message ---`);
        console.log(`ID: ${m.id}`);
        console.log(`Type: ${m.type}`);
        console.log(`Referral ID: ${m.referralId}`);
        console.log(`Created At: ${m.createdAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
