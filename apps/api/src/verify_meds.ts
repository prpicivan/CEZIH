async function testMedSearch() {
    const queries = ['Fosavance', 'alendronat', 'M05BB', 'Ramipril', 'paracetamol'];

    for (const q of queries) {
        console.log(`\nSearching for: "${q}"`);
        const response = await fetch(`http://localhost:3009/api/medication/search?q=${encodeURIComponent(q)}`);
        const data: any = await response.json();

        if (data.length > 0) {
            console.log(`Found ${data.length} results:`);
            data.forEach((item: any) => {
                console.log(` - [${item.atcCode}] ${item.name} (${item.genericName}) | Manufacturer: ${item.manufacturer}`);
            });
        } else {
            console.log('No results found.');
        }
    }
}

testMedSearch().catch(console.error);
