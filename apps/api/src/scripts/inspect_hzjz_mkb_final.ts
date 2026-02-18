
async function main() {
    try {
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        const data = await res.json();
        const firstKey = Object.keys(data)[0];
        const chapterData = data[firstKey];
        const records = chapterData.data;

        console.log('Total records in chapter:', records.length);
        console.log('Sample record:', JSON.stringify(records[0], null, 2));

        // Let's check another random record
        console.log('Sample record 10:', JSON.stringify(records[10], null, 2));

    } catch (e) {
        console.error('Failed:', e);
    }
}

main();
