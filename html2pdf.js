const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const htmlPath = path.resolve('C:\\Users\\adith\\Downloads\\adithya_resume_v4.html');
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: 'C:\\Users\\adith\\Downloads\\Adithya_Prasanna_Kumar_Resume.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' }
  });
  
  console.log('PDF saved successfully');
  await browser.close();
})();
