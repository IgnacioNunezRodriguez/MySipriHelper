const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const url = 'https://sipri.es/resultados/';
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extraer los href y el texto de los <a> dentro de <article>
    const links = await page.$$eval('article a', anchors =>
        anchors.map(a => ({
            href: a.href,
            text: a.textContent.trim()
        }))
    );

    // Obtener todas las tablas de cada enlace y combinarlas en un solo array
    const results = [];
    let count = 0;
    console.log(`Found ${links.length} links to process...`);
    for (const link of links) {
        console.log(`Processed ${count}/${links.length} links...`);
        try {
            const table = await getTableFromHref(link.href);
            // Para cada fila de la tabla, agrega href y texto al inicio
            for (const row of table) {
                results.push([link.href, link.text, ...row]);
                console.log(`Processed row: ${row.join(', ')}`);
            }
            count++;

        } catch (err) {
            // Si hay error, igual agrega el href y texto, pero deja columnas vacías
            results.push([link.href, link.text]);
        }
    }
    saveResultsToJson(results);

    await browser.close();
})();

async function getTableFromHref(href) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(href, { waitUntil: 'networkidle2' });

    // Extraer la primera tabla de la página
    const table = await page.$eval('table', table => {
        const rows = Array.from(table.rows);
        return rows.map(row =>
            Array.from(row.cells).map(cell => cell.textContent.trim())
        );
    });

    await browser.close();
    return table;
}

function saveResultsToJson(results, filename = 'results.json') {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
}