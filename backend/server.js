const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    let m3u8Url = null;

    // Intercept network requests to sniff out the .m3u8 stream
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const requestUrl = request.url();
      if (requestUrl.includes('.m3u8')) {
        if (!m3u8Url) { // Only capture the first one (often the master playlist)
          m3u8Url = requestUrl;
        }
      }
      request.continue();
    });

    // Go to the Tango page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for up to 10 seconds for the .m3u8 to be sniffed
    for (let i = 0; i < 20; i++) {
      if (m3u8Url) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (m3u8Url) {
      res.json({ rawStreamUrl: m3u8Url });
    } else {
      res.status(404).json({ error: 'Could not find a video stream on this page.' });
    }
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ error: 'Failed to extract video URL' });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Puppeteer Video Extractor API running on port ${PORT}`);
});
