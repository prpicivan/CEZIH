
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Full HZJZ MKB-10 Import...');

    try {
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();

        let count = 0;
        const chapters = Object.keys(data);
        console.log(`Found ${chapters.length} chapters.`);

        for (const chapterName of chapters) {
            const chapter = data[chapterName];
            if (!chapter.data) continue;

            const groupKeys = Object.keys(chapter.data);
            for (const groupKey of groupKeys) {
                const records = chapter.data[groupKey];
                if (!Array.isArray(records)) continue;

                for (const record of records) {
                    const code = record.mkb_10_code;
                    const name = record.diagnosis_name;

                    if (code && name) {
                        await prisma.mkb10.upsert({
                            where: { code: code },
                            update: { name: name },
                            create: { code: code, name: name }
                        });
                        count++;
                        if (count % 1000 === 0) console.log(`Processed ${count} MKB-10 diagnoses...`);
                    }
                }
            }
        }

        console.log(`✅ Success! Imported/Updated ${count} MKB-10 records from HZJZ API.`);
    } catch (e) {
        console.error('❌ MKB-10 Import failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
