const puppeteer = require('puppeteer');
const fs = require('fs');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const credentials = require('./credentials_gsheet.json');
require('dotenv').config();
const schedule = require('node-schedule');

function scrapeItems(){
    return Array.from(document.querySelectorAll('.height--all-full .aGrid #toc-target-deals >div.listLayout-main [id^="thread_"] '), element => {
        const model = element.querySelector('div.threadGrid >div.threadGrid-title .thread-title >a')
        const link =  element.id
        const lead_Anbieter = element.querySelector('div.threadGrid >div.threadGrid-title >span >a')
        const erstplatzierung_Anbieter = element.querySelector('div.threadGrid >div.threadGrid-title >span >a')
        const rate = element.querySelector('div.threadGrid >div.threadGrid-title >span >span >span')
        const grad = element.querySelector('div.threadGrid >div.threadGrid-headerMeta >div.space--b-2 >div.flex')
        const last_update = element.querySelector('div.threadGrid >div.threadGrid-headerMeta .text--color-greyShade')
        const datum = "=today()"

        return {
            model :  model ? model.innerText : '-',
            link : link ? "mydealz.de/" + link.slice(7) : '-',
            lead_Anbieter : lead_Anbieter ? lead_Anbieter.innerText : '-', 
            erstplatzierung_Anbieter : erstplatzierung_Anbieter ? erstplatzierung_Anbieter.innerText : '-', 
            rate: rate ? rate.innerText : '-',
            grad : grad ? grad.innerText : '-',
            last_update : last_update ? last_update.innerText : '-',
            datum : datum
        }   
    })
};


(async function ScrapeWebpage() {
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
    await browser.close();
    console.log(items)
    PasteinDB(items)
  })();


/* async function PasteGoogleSheet(data){
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
    await sheet.addRows(data[0])

}  */

async function PasteinDB (data){
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID); // set spreadsheet id
	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
    const sheet = await doc.sheetsByTitle['Kopie von DB'];
    const rows = await sheet.getRows();
    const length = rows.length-1;

    if (data[0].model == rows[length].model){
        return ;
    }
    else {
        await sheet.addRow(data[0])
    } 
}
