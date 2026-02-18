
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const filePath = '/Users/ivanprpic/Desktop/Projekti/cezih_v2/Dijagnoze_kod_kojih_Zavod_osigurava_placanje_zdr_zad_u_cijelosti_300710.xls';

async function main() {
    console.log('🚀 Starting HZZO Exemption Diagnoses Import...');

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row
    const rows = data.slice(1);
    let count = 0;

    for (const row of rows) {
        const code = String(row[0]).trim();
        const name = String(row[1]).trim();
        const exemptCode = String(row[2]).trim();

        if (code && name && code !== 'undefined' && name !== 'undefined') {
            await (prisma as any).cezihRegistry.upsert({
                where: {
                    type_code: {
                        type: 'EXEMPT_DIAG',
                        code: code
                    }
                },
                update: {
                    name: name,
                    description: exemptCode // Storing the "Šifra oslobađanja" here
                },
                create: {
                    type: 'EXEMPT_DIAG',
                    code: code,
                    name: name,
                    description: exemptCode
                }
            });
            count++;
            if (count % 100 === 0) console.log(`Processed ${count} exemption diagnoses...`);
        }
    }

    console.log(`✅ Success! Imported/Updated ${count} Exemption Diagnoses.`);
}

main()
    .catch((e) => {
        console.error('❌ Import failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
