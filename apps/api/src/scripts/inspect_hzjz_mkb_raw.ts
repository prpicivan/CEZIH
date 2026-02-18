
async function main() {
    try {
        console.log('Fetching MKB-10 data from HZJZ (RAW)...');
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        console.log('Status:', res.status);
        console.log('Headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));

        const text = await res.text();
        console.log('Raw body start (100 chars):');
        console.log(text.substring(0, 100));

        try {
            const data = JSON.parse(text);
            console.log('Parsed successfully.');
            if (Array.isArray(data)) {
                console.log('Data is an array. Length:', data.length);
            } else {
                console.log('Data is an object. Keys:', Object.keys(data));
            }
        } catch (je) {
            console.log('Failed to parse as JSON:', je.message);
        }
    } catch (e) {
        console.error('Failed to fetch:', e);
    }
}

main();
