/**
 * Receipt PDF Generator
 *
 * Generates professional payment receipts using Puppeteer (HTML → PDF)
 * Provides perfect Arabic/RTL text support
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { generateReceiptHTML } = require('./receiptTemplate');

/**
 * Generate a payment receipt PDF
 *
 * @param {Object} data - Receipt data
 * @param {string} data.receiptNumber - Unique receipt number
 * @param {Object} data.student - Student info {name, email}
 * @param {Object} data.course - Course info {title}
 * @param {Object} data.payment - Payment details {amount, method, date, notes}
 * @param {Object} data.billing - Billing summary {totalAmount, paidBefore, paidNow, remainingBalance}
 * @param {Object} data.issuedBy - Reception staff {name}
 * @param {string} data.enrollmentNotes - Enrollment notes (optional)
 * @param {string} outputPath - Path to save PDF file
 * @returns {Promise<string>} Path to generated PDF
 */
const generateReceipt = async (data, outputPath) => {
  let browser = null;
  
  try {
    // Generate HTML from template
    const html = generateReceiptHTML(data);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_BIN || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set content with HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Set viewport for A4 page
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 1
    });

    // Generate PDF (one page only)
    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '40px',
        bottom: '40px',
        left: '50px',
        right: '50px'
      },
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.95 // Slightly scale down to ensure one page
    });

    // Close browser
    await browser.close();
    browser = null;

    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('PDF file was not created');
    }

    return outputPath;

  } catch (error) {
    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }

    console.error('Error generating receipt PDF:', error);
    throw error;
  }
};

/**
 * Regenerate PDF from Receipt model data
 * Used when PDF file is missing/deleted
 *
 * @param {Object} receipt - Receipt mongoose document (must be populated)
 * @param {string} outputPath - Path to save PDF file
 * @returns {Promise<string>} Path to generated PDF
 */
const regenerateReceiptFromDB = async (receipt, outputPath) => {
  // Try to get English name from Lead database
  let studentName = receipt.student?.name || '';
  try {
    const Lead = require('../models/Lead');
    const lead = await Lead.findOne({
      $or: [
        { fullName: studentName },
        { email: receipt.student?.email }
      ]
    }).select('englishName fullName');

    if (lead && lead.englishName && lead.englishName.trim()) {
      studentName = lead.englishName;
    }
  } catch (leadError) {
    console.log('Could not fetch lead data for English name during regeneration:', leadError.message);
    // Continue with the original name
  }

  // Prepare receipt data from DB model
  const receiptData = {
    type: receipt.type || 'course',
    receiptNumber: receipt.receiptNumber,
    student: {
      name: studentName,
      email: receipt.student?.email || ''
    },
    course: {
      title: receipt.course?.title || ''
    },
    payment: {
      amount: receipt.payment.amount,
      method: receipt.payment.method || 'cash',
      date: receipt.payment.date || receipt.createdAt,
      notes: receipt.payment.notes || '',
      ...(receipt.payment.paymentCurrency === 'sp' && receipt.payment.paidInSP != null && {
        paymentCurrency: 'sp',
        amountInSP: receipt.payment.paidInSP
      })
    },
    billing: {
      totalAmount: receipt.billing.totalAmount,
      paidBefore: receipt.billing.paidBefore,
      paidNow: receipt.billing.paidNow,
      remainingBalance: receipt.billing.remainingBalance
    },
    enrollmentNotes: receipt.enrollment?.notes || '',
    issuedBy: {
      name: receipt.issuedBy?.name || ''
    }
  };

  // Generate PDF using existing function
  return await generateReceipt(receiptData, outputPath);
};

module.exports = {
  generateReceipt,
  regenerateReceiptFromDB
};
