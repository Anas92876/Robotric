import { LOGO_DATA_URI } from './assets/logo';
import { RECEIPT_TEMPLATE } from './assets/receipt-template';

/** Everything printed on a receipt. */
export interface ReceiptPrintData {
  type: 'course' | 'transportation';
  receiptNumber: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  payment: {
    amount: number;
    method: string;
    date: Date;
    notes: string;
    /** Set when the student paid in Syrian Pounds. */
    amountInSP: number | null;
  };
  billing: { totalAmount: number; paidBefore: number; paidNow: number; remainingBalance: number };
  enrollmentNotes: string;
  issuedByName: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const formatDate = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const formatCurrency = (n: number) => n.toFixed(2);
const formatMethod = (m: string) => (m || 'cash').replace('_', ' ').toUpperCase();

function conditional(html: string, name: string, show: boolean): string {
  const block = new RegExp(`\\{\\{#if ${name}\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`);
  return html.replace(block, show ? '$1' : '');
}

/** Fills the receipt template exactly as the old receiptTemplate.js did. */
export function buildReceiptHtml(d: ReceiptPrintData): string {
  const transport = d.type === 'transportation';
  const currencyLabel = transport ? 'S.P.' : 'USD';
  const currencySymbol = transport ? '' : '$';
  // Syrian Pounds have no decimals; USD shows two.
  const amount = (n: number) => (transport ? Math.round(n).toLocaleString() : formatCurrency(n));

  const paidNowDisplay =
    !transport && d.payment.amountInSP != null
      ? `${Math.round(d.payment.amountInSP).toLocaleString()} S.P. (equivalent to $${formatCurrency(d.billing.paidNow || d.payment.amount)} USD)`
      : `${currencySymbol}${amount(d.billing.paidNow)} ${currencyLabel}`;

  const values: Record<string, string> = {
    logoBase64: LOGO_DATA_URI,
    receiptNumber: escapeHtml(d.receiptNumber),
    receiptTitle: transport ? 'Transportation Payment Receipt' : 'Course Payment Receipt',
    paymentLabel: transport ? 'Transportation Payment' : 'Course Payment',
    currencyLabel: escapeHtml(currencyLabel),
    currencySymbol: escapeHtml(currencySymbol),
    paymentDate: escapeHtml(formatDate(d.payment.date)),
    paymentTime: escapeHtml(formatTime(d.payment.date)),
    studentName: escapeHtml(d.studentName),
    studentEmail: escapeHtml(d.studentEmail),
    courseTitle: escapeHtml(d.courseTitle),
    totalAmount: amount(d.billing.totalAmount),
    paidBefore: amount(d.billing.paidBefore),
    paidNow: amount(d.billing.paidNow),
    paidNowDisplay: escapeHtml(paidNowDisplay),
    remainingBalance: amount(d.billing.remainingBalance),
    paymentMethod: formatMethod(d.payment.method),
    enrollmentNotes: escapeHtml(d.enrollmentNotes),
    paymentNotes: escapeHtml(d.payment.notes),
    issuedByName: escapeHtml(d.issuedByName),
  };

  let html = RECEIPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
  html = conditional(html, 'enrollmentNotes', d.enrollmentNotes.trim().length > 0);
  html = conditional(html, 'paymentNotes', d.payment.notes.trim().length > 0);
  return html;
}
