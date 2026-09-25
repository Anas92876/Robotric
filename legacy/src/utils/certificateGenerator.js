/**
 * Certificate PDF Generator — Puppeteer (HTML → PDF A4 landscape)
 * Same pattern as receiptGenerator.js
 */

const puppeteer = require('puppeteer');
const fs        = require('fs');
const { generateCertificateHTML } = require('./certificateTemplate');

/**
 * @param {object} data  { certificateNumber, studentName, courseName, courseLevel?, issuedAt }
 * @param {string} outputPath  Absolute path to save the PDF
 * @returns {Promise<string>}  outputPath
 */
const generateCertificatePDF = async (data, outputPath) => {
  let browser = null;

  try {
    const html = generateCertificateHTML(data);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_BIN || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // A4 landscape viewport
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 2 });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    await browser.close();
    browser = null;

    if (!fs.existsSync(outputPath)) {
      throw new Error('Certificate PDF was not created');
    }

    return outputPath;

  } catch (error) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error('Error generating certificate PDF:', error);
    throw error;
  }
};

module.exports = { generateCertificatePDF };
