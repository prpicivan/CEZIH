
async function main() {
    try {
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        const data = await res.json();
        const firstKey = Object.keys(data)[0];
        console.log('Chapter:', firstKey);
        const chapterData = data[firstKey];
        console.log('Chapter data keys:', Object.keys(chapterData));

        // Let's see some actual data
        const subKey = Object.keys(chapterData)[0];
        console.log('Sub-chapter:', subKey);
        const records = chapterData[subKey];
        console.log('Records type:', Array.isArray(records) ? 'Array' : typeof records);
        if (Array.isArray(records)) {
            console.log('Sample record:', JSON.stringify(records[0], null, 2));
        } else {
            console.log('Sample content (first 200 chars):', JSON.stringify(records).substring(0, 200));
        }

    } catch (e) {
        console.error('Failed:', e);
    }
}

main();
