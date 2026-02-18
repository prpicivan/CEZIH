import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const medications = [
    {
        atcCode: 'M05BB03',
        name: 'Fosavance',
        genericName: 'alendronat natrij + kolekalciferol',
        manufacturer: 'Merck Sharp & Dohme',
        isSupplemental: false
    },
    {
        atcCode: 'C09AA05',
        name: 'Ramipril',
        genericName: 'ramipril',
        manufacturer: 'Generic Pharma',
        isSupplemental: false
    },
    {
        atcCode: 'N02BE01',
        name: 'Lekadol',
        genericName: 'paracetamol',
        manufacturer: 'Lek',
        isSupplemental: true
    }
];

async function main() {
    console.log('Seeding HZZO Medication List (G_export)...');

    for (const med of medications) {
        await (prisma as any).medicine.upsert({
            where: { atcCode: med.atcCode },
            update: {
                name: med.name,
                genericName: med.genericName,
                manufacturer: med.manufacturer,
                isSupplemental: med.isSupplemental
            },
            create: med
        });
    }

    const count = await (prisma as any).medicine.count();
    console.log(`Successfully seeded ${count} medications.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
