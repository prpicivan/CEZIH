import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mkb10Codes = [
    { code: 'U07.1', name: 'Akutna respiratorna bolest uzrokovana 2019-nCoV' },
    { code: 'U07.2', name: 'COVID-19, virus nije identificiran' },
    { code: 'C76.4', name: 'Maligna novotvorina gornjeg uda, nespecificirana' },
    { code: 'R10.4', name: 'Ostala i nespecificirana trbušna bol' },
    { code: 'I10', name: 'Esencijalna (primarna) hipertenzija' },
    { code: 'E11', name: 'Dijabetes melitus neovisan o inzulinu' },
    { code: 'J06.9', name: 'Akutna infekcija gornjega dišnog sustava, nespecificirana' },
    { code: 'M54.5', name: 'Križobolja' },
    { code: 'A09', name: 'Dijareja i gastroenteritis vjerojatno infektivnog podrijetla' },
    { code: 'G43.9', name: 'Migrena, nespecificirana' },
    { code: 'F32.9', name: 'Depresivna epizoda, nespecificirana' },
    { code: 'N39.0', name: 'Infekcija mokraćnog sustava, lokacija nespecificirana' },
    { code: 'Z00.0', name: 'Opći medicinski pregled' },
    { code: 'K21.9', name: 'Gastroezofagealni refluks, bez ezofagitisa' },
    { code: 'J45.9', name: 'Astma, nespecificirana' }
];

async function main() {
    console.log('Seeding MKB-10 Codebook...');

    for (const item of mkb10Codes) {
        await (prisma as any).mkb10.upsert({
            where: { code: item.code },
            update: { name: item.name },
            create: {
                code: item.code,
                name: item.name
            }
        });
    }

    const count = await (prisma as any).mkb10.count();
    console.log(`Successfully seeded ${count} MKB-10 codes.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
