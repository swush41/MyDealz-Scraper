const puppeteer = require('puppeteer');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const credentials = require('./credentials_gsheet.json');
const axios = require('axios');
require('dotenv').config();
const schedule = require('node-schedule');

const rule = new schedule.RecurrenceRule();
rule.minute = 41;


function scrapeItems(){
    return Array.from(document.querySelectorAll('.height--all-full .aGrid #toc-target-deals >div.listLayout-main [id^="thread_"] '), element => {
        const model = element.querySelector('div.threadGrid >div.threadGrid-title .thread-title >a')
        const link =  element.id
        const lead_Anbieter = element.querySelector('div.threadGrid >div.threadGrid-title >span >a')
        const erstplatzierung_Anbieter = element.querySelector('div.threadGrid >div.threadGrid-title >span >a')
        const rate = element.querySelector('div.threadGrid >div.threadGrid-title >span >span >span')
        const grad = element.querySelector('div.threadGrid >div.threadGrid-headerMeta >div.space--b-2 >div.flex')
        const online_seit = element.querySelector('div.threadGrid >div.threadGrid-headerMeta .text--color-greyShade')
        const datum = "=today()"

        return {
            model :  model ? model.innerText : '-',
            link : link ? "mydealz.de/" + link.slice(7) : '-',
            lead_Anbieter : lead_Anbieter ? lead_Anbieter.innerText : '-', 
            erstplatzierung_Anbieter : erstplatzierung_Anbieter ? erstplatzierung_Anbieter.innerText : '-', 
            rate: rate ? rate.innerText : '-',
            grad : grad ? grad.innerText.replace("°","").replace("\nAbgelaufen","")  : '-',
            online_seit : online_seit ? online_seit.innerText : '-',
            datum : datum
        }   
    })
};


const job = schedule.scheduleJob(rule, function(){
    

        (async function ScrapeWebpage() {
            const browser = await puppeteer.launch(
            {       
                //   executablePath: 'google-chrome-stable',
                //   headless: false,
                    args: ['--no-sandbox','--disable-setuid-sandbox']
                });


            const page = await browser.newPage();
            page.setViewport({ width: 1280, height: 926 })
            await page.goto('https://www.mydealz.de/gruppe/auto-leasing');
            await page.waitForFunction(`document.body.scrollHeight`)
            const items = await page.evaluate(scrapeItems);
            await browser.close();
            console.log(items.reverse())
            console.log("new scraped: ")
            console.log(items.length)
            PasteGoogleSheet(items.reverse())
            PasteinDB(items.reverse())
        })();


        async function PasteGoogleSheet(data){
            const doc = new GoogleSpreadsheet(process.env.SHEET_ID); // set spreadsheet id
            await doc.useServiceAccountAuth(credentials);
            await doc.loadInfo();
            const sheet = await doc.sheetsByTitle['Scraper Entries'];
            await sheet.clear();
            await sheet.setHeaderRow([
                "model",
                "link",
                "lead_Anbieter",
                "erstplatzierung_Anbieter",
                "rate",
                "grad",
                "online_seit",
                "datum"
            ]);
            await sheet.addRows(data)

        }  

});

async function PasteinDB (data){
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID); // set spreadsheet id
	await doc.useServiceAccountAuth(credentials);
	await doc.loadInfo();
    const sheet = await doc.sheetsByTitle['DB'];
    const rows = await sheet.getRows();
    const length = rows.length
 
    // update grad cells
    for (var i = 0 ; i < length ; i++){
        let index = data.map( a => a.link).indexOf(rows[i].link) // rows of dash
            if( index > -1 ){
                rows[i].grad = data[index].grad;
                await rows[i].save();
                data.splice(index,1); // kick out the already existing cells
            }
    }
    console.log("new added: ")
    console.log(data.length)
    await sheet.addRows(data)

    // send a slack message if new entry comes in
        if (data.length>0){
            const message = `${data[data.length-1].model}`
            const link = `${data[data.length-1].link}`
            postToSlack(message,link)
        }
}

async function postToSlack(message,link) {

    const url = process.env.SLACK_URL;

    await axios.post(
        url,
        {
        'channel' : '#mydealz_marketing',
        'username' : 'New Deal Alarm',
        'icon_url' : 'https://mein.handy-alarm.com/images/logo.png',
        'blocks':[
                  {
            "type": "section",
            "text":{
                "type": "mrkdwn",
                "text": "<!channel> New entry just dropped: ",
                },
            },
            {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "``` " + message + "\n```"
                    }
           },
           {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "``` Link: " + link + "\n```"
                    }
           }
        ],
        'attachments': [{
            'text': "Sheet: " + process.env.SLACK_SHEET_ID +"\n"
               }]
        })
        .catch(function (error) {
            console.log(error);
        });
}; 