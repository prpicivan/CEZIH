
async function main() {
    try {
        const res = await fetch('https://mkb.hzjz.hr/api/data');
        const data = await res.json();

        const chapters = Object.keys(data);
        console.log('Total chapters:', chapters.length);

        const firstChapter = data[chapters[0]];
        console.log('First chapter type:', typeof firstChapter);
        console.log('First chapter keys:', Object.keys(firstChapter));

        if (firstChapter.data && Array.isArray(firstChapter.data)) {
            console.log('Found "data" array in chapter. Length:', firstChapter.data.length);
            console.log('Sample record from "data":', JSON.stringify(firstChapter.data[0], null, 2));
        } else {
            console.log('"data" key is not an array or does not exist.');
            // Let's log the first few entries of the chapter strictly
            const subEntries = Object.entries(firstChapter).slice(0, 5);
            console.log('Sub-entries sample:', JSON.stringify(subEntries, null, 2));
        }

    } catch (e) {
        console.error('Failed:', e);
    }
}

main();
