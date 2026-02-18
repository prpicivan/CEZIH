import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const registries = [
    // 2. Djelatnosti u ZZ (Activities / Departments)
    { type: 'ACTIVITY', code: '2050000', name: 'Fizikalna medicina i rehabilitacija' },
    { type: 'ACTIVITY', code: '2010000', name: 'Opća medicina' },
    { type: 'ACTIVITY', code: '1090000', name: 'Oftalmologija' },
    { type: 'ACTIVITY', code: '1010000', name: 'Interna medicina' },
    { type: 'ACTIVITY', code: '1070101', name: 'Dermatologija i venerologija' },
    { type: 'ACTIVITY', code: '1020000', name: 'Kardiologija' },
    { type: 'ACTIVITY', code: '1060000', name: 'Neurologija' },
    { type: 'ACTIVITY', code: '6010000', name: 'Ginekologija i opstetricija' },
    { type: 'ACTIVITY', code: '1030000', name: 'Dermatovenerologija' },
    { type: 'ACTIVITY', code: '1100000', name: 'Psihijatrija' },
    { type: 'ACTIVITY', code: '5010000', name: 'Kirurgija' },
    { type: 'ACTIVITY', code: '5020000', name: 'Ortopedija' },
    { type: 'ACTIVITY', code: '5060000', name: 'Urologija' },
    { type: 'ACTIVITY', code: '2110000', name: 'Pedijatrija' },
    { type: 'ACTIVITY', code: '2010101', name: 'Obiteljska medicina' },
    { type: 'ACTIVITY', code: '1040000', name: 'Radiologija' },
    { type: 'ACTIVITY', code: '0101', name: 'Opća dentalna medicina' },

    // 1. Kategorija osiguranika
    { type: 'INS_CAT', code: '01', name: 'Zaposlene osobe' },
    { type: 'INS_CAT', code: '02', name: 'Umirovljenici' },
    { type: 'INS_CAT', code: '03', name: 'Članovi obitelji' },
    { type: 'INS_CAT', code: '07', name: 'Nezaposlene osobe' },
    { type: 'INS_CAT', code: '08', name: 'Korisnici socijalne skrbi' },
    { type: 'INS_CAT', code: '10', name: 'Hrvatski ratni vojni invalidi' },

    // 5. Pisma zdravstvenom djelatniku
    { type: 'NOTICES', code: 'P01', name: 'Promjena pravila propisivanja antibiotika' },
    { type: 'NOTICES', code: 'P02', name: 'Obavijest o povlačenju lijeka Seroxat' },

    // 6. Dijagnoze za 100% pokriće (Exemption Diags)
    { type: 'EXEMPT_DIAG', code: 'C76.4', name: 'Zloćudna novotvorina ruke' },
    { type: 'EXEMPT_DIAG', code: 'E11', name: 'Dijabetes tip 2' },

    // 7. Šifre oslobađanja (Exemption Codes)
    { type: 'EXEMPT_CODE', code: '66', name: 'Cjelokupno liječenje zloćudnih bolesti' },
    { type: 'EXEMPT_CODE', code: '60', name: 'Zdravstvena zaštita djece do 18. godine' },
    { type: 'EXEMPT_CODE', code: '01', name: 'Oslobađanje temeljem prihoda (Cenzus)' },

    // 8. Vrste računa (Invoice Types)
    { type: 'INV_TYPE', code: 'F1', name: 'Račun za SKZZ (HZZO_F1)' },
    { type: 'INV_TYPE', code: 'F2', name: 'Račun za bolničku ZZ (HZZO_F2)' },

    // 9. Statusi računa
    { type: 'INV_STATUS', code: '1', name: 'Zatvoren (Closed)' },
    { type: 'INV_STATUS', code: '2', name: 'U obradi (In processing)' },
    { type: 'INV_STATUS', code: '3', name: 'Poslan (Sent)' },
    { type: 'INV_STATUS', code: '4', name: 'Plaćen (Paid)' },
    { type: 'INV_STATUS', code: '5', name: 'Odbijen (Rejected)' },

    // 10. Težina grešaka
    { type: 'ERR_WEIGHT', code: 'W', name: 'Upozorenje (Warning)' },
    { type: 'ERR_WEIGHT', code: 'E', name: 'Kritična greška (Error)' },

    // 11. Greške web servisa (SOAP / HZZO Errors)
    { type: 'SOAP_ERR', code: '999', name: 'Tehnička greška (Unknown technical error)' },
    { type: 'SOAP_ERR', code: '101', name: 'Neispravan format MBOa' },
    { type: 'SOAP_ERR', code: '202', name: 'Uputnica nije nađena' },
    { type: 'SOAP_ERR', code: '305', name: 'Pacijent nema obvezno osiguranje' },
    { type: 'SOAP_ERR', code: '412', name: 'Ustanova nema ugovor za navedeni postupak' },
    { type: 'SOAP_ERR', code: '501', name: 'Dupli račun (Već postoji u bazi HZZO)' }
];

async function main() {
    console.log('Seeding Unified HZZO Registries...');

    for (const reg of registries) {
        await (prisma as any).cezihRegistry.upsert({
            where: {
                type_code: {
                    type: reg.type,
                    code: reg.code
                }
            },
            update: {
                name: reg.name
            },
            create: reg
        });
    }

    const count = await (prisma as any).cezihRegistry.count();
    console.log(`Successfully seeded ${count} registry records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
