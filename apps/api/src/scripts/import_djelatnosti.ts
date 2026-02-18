
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const filePath = '/Users/ivanprpic/Desktop/Projekti/cezih_v2/djelatnosti_30112011-2.xls';

async function main() {
    console.log('🚀 Starting HZZO Djelatnosti Import...');

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row
    const rows = data.slice(1);
    let count = 0;

    for (const row of rows) {
        const code = String(row[0]);
        const name = String(row[1]);

        if (code && name && code !== 'undefined' && name !== 'undefined') {
            await (prisma as any).cezihRegistry.upsert({
                where: {
                    type_code: {
                        type: 'ACTIVITY',
                        code: code
                    }
                },
                update: {
                    name: name
                },
                create: {
                    type: 'ACTIVITY',
                    code: code,
                    name: name
                }
            });
            count++;
            if (count % 50 === 0) console.log(`Processed ${count} records...`);
        }
    }

    console.log(`✅ Success! Imported/Updated ${count} Djelatnosti records.`);
}

main()
    .catch((e) => {
        console.error('❌ Import failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
