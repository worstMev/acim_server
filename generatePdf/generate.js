const puppeteer = require('puppeteer');

async function generatePdf(html,stylePath=null){
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html);
    if( stylePath ) await page.addStyleTag({ path : stylePath });
    const pdfBuffer = await page.pdf();

    await page.close();
    await browser.close();

    return pdfBuffer;
}


module.exports = {
    generatePdf,
}
