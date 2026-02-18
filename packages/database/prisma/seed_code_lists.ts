
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MKB_CODES = [
    { code: 'R10.4', name: 'Ostala i nespecificirana trbušna bol', type: 'MKB-10' },
    { code: 'I10', name: 'Primarna (esencijalna) hipertenzija', type: 'MKB-10' },
    { code: 'E11', name: 'Dijabetes melitus neovisan o inzulinu', type: 'MKB-10' },
    { code: 'J06', name: 'Akutne infekcije gornjega dišnog sustava', type: 'MKB-10' }
];

const SPECIALTIES = [
    { code: '1010101', name: 'Opća medicina', type: 'SPECIALTY' },
    { code: '2020202', name: 'Radiologija', type: 'SPECIALTY' },
    { code: '3030303', name: 'Interna medicina', type: 'SPECIALTY' }
];

async function main() {
    console.log('Seeding CEZIH Code Lists...');

    for (const item of [...MKB_CODES, ...SPECIALTIES]) {
        await prisma.cezihRegistry.upsert({
            where: { code: item.code },
            update: { name: item.name, type: item.type },
            create: { code: item.code, name: item.name, type: item.type }
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
