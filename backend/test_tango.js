const puppeteer = require('puppeteer');

(async () => {
  const url = "https://www.tango.me/stream/kncuh7ufOTK1YsQMj2LRPA";
  let m3u8Url = null;
  console.log("Starting Puppeteer test for Tango URL...");

  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const requestUrl = request.url();
      if (requestUrl.includes('.m3u8') || requestUrl.includes('.flv') || requestUrl.includes('.mp4')) {
        console.log("FOUND MEDIA URL:", requestUrl);
        if (!m3u8Url) { 
          m3u8Url = requestUrl;
        }
      }
      request.continue();
    });

    console.log("Navigating to:", url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log("Waiting for stream URL interception...");
    for (let i = 0; i < 20; i++) {
      if (m3u8Url) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (m3u8Url) {
      console.log("\nSUCCESS! Extracted Stream URL:\n", m3u8Url);
    } else {
      console.log("\nFAILED: No video stream intercepted.");
    }
    
    await browser.close();
  } catch(e) {
    console.error("Error:", e);
  }
})();
