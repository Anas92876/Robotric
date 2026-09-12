/**
 * Receipt HTML Template Engine
 * 
 * Generates HTML from template with data replacement
 */

const fs = require('fs');
const path = require('path');

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Convert image file to base64 data URI
 * @param {string} imagePath - Path to image file
 * @returns {string} Base64 data URI or empty string
 */
const imageToBase64 = (imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      return '';
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 
                     ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                     ext === '.gif' ? 'image/gif' : 'image/png';
    return `data:${mimeType};base64,${imageBase64}`;
  } catch (error) {
    console.warn('Error converting image to base64:', error.message);
    return '';
  }
};

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time for display
 * @param {Date} date - Date object
 * @returns {string} Formatted time string
 */
const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0.00';
  return parseFloat(amount).toFixed(2);
};

/**
 * Format payment method label
 * @param {string} method - Payment method
 * @returns {string} Formatted method label
 */
const formatPaymentMethod = (method) => {
  if (!method) return 'CASH';
  return method.replace('_', ' ').toUpperCase();
};

/**
 * Generate HTML receipt from template and data
 * @param {Object} data - Receipt data
 * @param {string} data.receiptNumber - Unique receipt number
 * @param {Object} data.student - Student info {name, email}
 * @param {Object} data.course - Course info {title}
 * @param {Object} data.payment - Payment details {amount, method, date, notes}
 * @param {Object} data.billing - Billing summary {totalAmount, paidBefore, paidNow, remainingBalance}
 * @param {Object} data.issuedBy - Reception staff {name}
 * @param {string} data.enrollmentNotes - Enrollment notes (optional)
 * @returns {string} Generated HTML string
 */
const generateReceiptHTML = (data) => {
  // Read template file
  const templatePath = path.join(__dirname, '../templates/receipt.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Get logo base64
  const logoPath = path.join(__dirname, '../../public/logo.png');
  const logoBase64 = imageToBase64(logoPath);

  // Determine receipt type and title
  const receiptType = data.type || 'course';
  const receiptTitle = receiptType === 'transportation' 
    ? 'Transportation Payment Receipt' 
    : 'Course Payment Receipt';
  const paymentLabel = receiptType === 'transportation'
    ? 'Transportation Payment'
    : 'Course Payment';
  const currencyLabel = receiptType === 'transportation' ? 'S.P.' : 'USD';
  const currencySymbol = receiptType === 'transportation' ? '' : '$';

  // Format amount based on receipt type (S.P. has no decimals, USD has 2 decimals)
  const formatAmount = (amount) => {
    if (receiptType === 'transportation') {
      return Math.round(amount).toLocaleString();
    }
    return formatCurrency(amount);
  };

  // For course receipts: "This Payment" row - show S.P. + USD when paid in Syrian Pounds
  let paidNowDisplay = '';
  if (receiptType === 'course' && data.payment?.paymentCurrency === 'sp' && data.payment?.amountInSP != null) {
    const spFormatted = Math.round(parseFloat(data.payment.amountInSP)).toLocaleString();
    const usdFormatted = formatCurrency(data.billing?.paidNow || data.payment?.amount || 0);
    paidNowDisplay = `${spFormatted} S.P. (equivalent to $${usdFormatted} USD)`;
  } else {
    paidNowDisplay = `${currencySymbol}${formatAmount(data.billing?.paidNow || 0)} ${currencyLabel}`;
  }

  // Prepare replacement values
  const replacements = {
    logoBase64: logoBase64 || '',
    receiptNumber: escapeHtml(data.receiptNumber || ''),
    receiptTitle: escapeHtml(receiptTitle),
    paymentLabel: escapeHtml(paymentLabel),
    currencyLabel: escapeHtml(currencyLabel),
    currencySymbol: escapeHtml(currencySymbol),
    paymentDate: escapeHtml(formatDate(data.payment?.date || new Date())),
    paymentTime: escapeHtml(formatTime(data.payment?.date || new Date())),
    studentName: escapeHtml(data.student?.name || ''),
    studentEmail: escapeHtml(data.student?.email || ''),
    courseTitle: escapeHtml(data.course?.title || ''),
    totalAmount: formatAmount(data.billing?.totalAmount || 0),
    paidBefore: formatAmount(data.billing?.paidBefore || 0),
    paidNow: formatAmount(data.billing?.paidNow || 0),
    paidNowDisplay: escapeHtml(paidNowDisplay),
    remainingBalance: formatAmount(data.billing?.remainingBalance || 0),
    paymentMethod: formatPaymentMethod(data.payment?.method || 'cash'),
    enrollmentNotes: escapeHtml(data.enrollmentNotes || ''),
    paymentNotes: escapeHtml(data.payment?.notes || ''),
    issuedByName: escapeHtml(data.issuedBy?.name || '')
  };

  // Replace all placeholders first (including those inside conditionals)
  Object.keys(replacements).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(regex, replacements[key]);
  });

  // Handle conditional blocks after placeholders are replaced
  // Enrollment notes - show if notes exist and are not empty
  if (data.enrollmentNotes && data.enrollmentNotes.trim()) {
    // Replace conditional block with its content
    html = html.replace(/\{\{#if enrollmentNotes\}\}([\s\S]*?)\{\{\/if\}\}/, '$1');
  } else {
    // Remove conditional block if no notes
    html = html.replace(/\{\{#if enrollmentNotes\}\}[\s\S]*?\{\{\/if\}\}/, '');
  }

  // Payment notes - show if notes exist and are not empty
  if (data.payment?.notes && data.payment.notes.trim()) {
    // Replace conditional block with its content
    html = html.replace(/\{\{#if paymentNotes\}\}([\s\S]*?)\{\{\/if\}\}/, '$1');
  } else {
    // Remove conditional block if no notes
    html = html.replace(/\{\{#if paymentNotes\}\}[\s\S]*?\{\{\/if\}\}/, '');
  }

  return html;
};

module.exports = {
  generateReceiptHTML,
  escapeHtml,
  formatDate,
  formatTime,
  formatCurrency
};
