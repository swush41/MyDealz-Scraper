const puppeteer = require('puppeteer');
const fs = require('fs');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const credentials = require('./credentials_gsheet.json');
require('dotenv').config();

function scrapeItems(){
    return Array.from(document.querySelectorAll('.height--all-full .aGrid #toc-target-deals >div.listLayout-main [id^="thread_"] '), element => {
        const model = element.querySelector('div.threadGrid >div.threadGrid-title .thread-title >a')
        const url =  element.id
        const platform = element.querySelector('div.threadGrid >div.threadGrid-title >span >a')
        const rate = element.querySelector('div.threadGrid >div.threadGrid-title >span >span >span')
        const grad = element.querySelector('div.threadGrid >div.threadGrid-headerMeta >div.space--b-2 >div.flex')
        const update = element.querySelector('div.threadGrid >div.threadGrid-headerMeta .text--color-greyShade')

        return {
            model :  model ? model.innerText : '-',
            url : url ? "mydealz.de/" + url.slice(7) : '-',
            platform : platform ? platform.innerText : '-', 
            rate: rate ? rate.innerText : '-',
            grad : grad ? grad.innerText : '-',
            update : update ? update.innerText : '-'
        }
    })
};

(async () => {
    const browser = await puppeteer.launch(
        {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    );
    
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 926 })
    await page.goto('https://www.mydealz.de/gruppe/auto-leasing-hot');
    await page.waitForFunction(`document.body.scrollHeight`)
    const items = await page.evaluate(scrapeItems);
    
    convertDataArrayToCSV ('./data.csv', items)
    await browser.close();
    console.log(items)
    PasteGoogleSheet(items)
  })();


  function convertDataArrayToCSV (fileName, data) {

	const header = Object.keys(data[0])
	let csv = data.map(row => header
		.map(fieldName => row[fieldName] === null ? '' : row[fieldName])
		.join(';'))
	csv.unshift(header.join(';'))
	csv = csv.join('\r\n')
	fs.writeFileSync(fileName, csv)	

}  

async function PasteGoogleSheet(data){
	const doc = new GoogleSpreadsheet(process.env.SHEET_ID); // set spreadsheet id
	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
    const sheet = await doc.sheetsByTitle['Scraper Entries'];
    await sheet.clear();
    await sheet.setHeaderRow([
        "model",
        "url",
        "platform",
        "rate",
        "grad",
        "update"
    ]);
    await sheet.addRows(data)

}