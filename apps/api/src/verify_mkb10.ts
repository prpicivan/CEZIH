async function testMkb10Search() {
    const queries = ['U07', 'Križobolja', 'Astma'];

    for (const q of queries) {
        console.log(`\nSearching for: "${q}"`);
        const response = await fetch(`http://localhost:3009/api/codebooks/mkb10?search=${encodeURIComponent(q)}`);
        const data: any = await response.json();

        if (data.length > 0) {
            console.log(`Found ${data.length} results:`);
            data.forEach((item: any) => {
                console.log(` - ${item.code}: ${item.name}`);
            });
        } else {
            console.log('No results found.');
        }
    }
}

testMkb10Search().catch(console.error);
