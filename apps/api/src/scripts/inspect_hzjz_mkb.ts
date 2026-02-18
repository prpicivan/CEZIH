
async function main() {
    try {
        console.log('Fetching MKB-10 data from HZJZ...');
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();
        console.log('Response type:', typeof data);
        if (Array.isArray(data)) {
            console.log('Data is an array. Total items:', data.length);
            console.log(JSON.stringify(data.slice(0, 3), null, 2));
        } else {
            console.log('Data keys:', Object.keys(data));
            // Check common keys like 'data', 'items', 'results'
            const possibleDataKeys = ['data', 'items', 'results', 'value'];
            for (const key of possibleDataKeys) {
                if (Array.isArray(data[key])) {
                    console.log(`Found array in key "${key}". Total items:`, data[key].length);
                    console.log(JSON.stringify(data[key].slice(0, 3), null, 2));
                    break;
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch:', e);
    }
}

main();
