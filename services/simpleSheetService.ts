import Papa from 'papaparse';

export async function fetchSimpleSheet(url: string) {
    const response = await fetch(url);
    const csvText = await response.text();
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}
