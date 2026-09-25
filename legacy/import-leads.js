/**
 * CSV Lead Importer
 * Reads داتا.csv and bulk-inserts leads into MongoDB using the Lead model.
 *
 * Usage :
 *   node import-leads.js
 *
 * Requirements:
 *   - .env must have MONGO_URI set
 *   - You must set CREATED_BY_USER_ID below (any existing admin/reception User _id)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// ─── CONFIGURE THIS ────────────────────────────────────────────────────────────
// Paste any existing User _id from your DB (admin or reception account)
const CREATED_BY_USER_ID = 'REPLACE_WITH_REAL_USER_ID';
// Path to the CSV file
const CSV_PATH = 'C:/Users/USER/Downloads/داتا.csv';
// ───────────────────────────────────────────────────────────────────────────────

const Lead = require('./src/models/Lead');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Reject clearly non-date strings (Arabic text, grade levels, etc.)
  if (/[\u0600-\u06FF]/.test(trimmed)) return null;

  // Try DD/MM/YYYY or M/D/YYYY
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p, 10));
    // year is last part
    if (c > 1900 && c <= 2030 && a <= 31 && b <= 12) {
      const d = new Date(c, b - 1, a);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Try native parse as fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function parseGender(raw) {
  if (!raw || !raw.trim()) return undefined;
  if (raw.includes('ذكر')) return 'male';
  if (raw.includes('أنثى') || raw.includes('انثى')) return 'female';
  return undefined;
}

function cleanPhone(raw) {
  if (!raw || !raw.trim()) return null;
  const t = raw.trim();
  if (t === '_' || t === '-' || t === '') return null;
  return t;
}

// Map Arabic label (الأم, الأب, etc.) to English label
function mapLabel(raw) {
  if (!raw || !raw.trim()) return 'Other';
  const t = raw.trim();
  if (t.includes('الأم') || t.includes('الام')) return 'Mother';
  if (t.includes('الأب') || t.includes('الاب')) return 'Father';
  if (t.includes('الأخ') || t.includes('الاخ')) return 'Brother';
  if (t.includes('الأخت')) return 'Sister';
  return t; // keep original if unknown
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());

  // Skip header (line 0)
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — handles no quotes in this file
    const cols = lines[i].split(',');
    rows.push(cols);
  }
  return rows;
}

// Column indices (0-based):
// 0  تاريخ التسجيل
// 1  الاسم الأول
// 2  الاسم الثاني
// 3  الاسم الكامل (عربي)
// 4  الاسم الكامل (إنكليزي)
// 5  الجنس
// 6  تاريخ الميلاد
// 7  اسم الأب
// 8  اسم الأم
// 9  رقم الهاتف الأول
// 10 رقم الهاتف الثاني
// 11 الرقم الثاني تابع لـ
// 12 مكان الإقامة
// 13 اسم المدرسة/التخصص
// 14 الاهتمام
// 15 المرجع
// 16 ملاحظات

function rowToLead(cols, createdBy) {
  const get = i => (cols[i] || '').trim();

  const fullName = get(3) || `${get(1)} ${get(2)}`.trim();
  if (!fullName) return null; // skip completely empty rows

  // Determine primary phone — some rows have phone1 empty, phone2 filled
  const phone1 = cleanPhone(get(9));
  const phone2 = cleanPhone(get(10));
  const secondLabel = mapLabel(get(11));

  const mobileNumber = phone1 || phone2;
  if (!mobileNumber) return null; // required field — skip if both missing

  const additionalNumbers = [];
  if (phone1 && phone2) {
    additionalNumbers.push({ number: phone2, label: secondLabel });
  }

  // Handle invalid dateOfBirth — store raw text in notes if unparseable
  const rawDob = get(6);
  const dateOfBirth = parseDate(rawDob);
  const dobNote = (!dateOfBirth && rawDob) ? `تاريخ الميلاد: ${rawDob}` : null;

  const rawNotes = get(16);
  const noteParts = [dobNote, rawNotes].filter(Boolean);
  const notes = noteParts.join(' | ') || undefined;

  const leadDate = parseDate(get(0)) || undefined;

  return {
    fullName,
    firstName: get(1) || undefined,
    lastName: get(2) || undefined,
    englishName: get(4) || undefined,
    gender: parseGender(get(5)),
    fatherName: get(7) || undefined,
    motherName: get(8) || undefined,
    dateOfBirth: dateOfBirth || undefined,
    residence: get(12) || undefined,
    schoolName: get(13) || undefined,
    mobileNumber,
    mobileNumberLabel: phone1 ? 'Main' : secondLabel,
    additionalNumbers,
    interestField: get(14) || undefined,
    referralSource: get(15) || undefined,
    notes,
    leadDate,
    status: 'interest',
    createdBy,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (CREATED_BY_USER_ID === 'REPLACE_WITH_REAL_USER_ID') {
    console.error('❌  Set CREATED_BY_USER_ID in this script before running.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  const rows = parseCSV(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from CSV.\n`);

  const createdBy = new mongoose.Types.ObjectId(CREATED_BY_USER_ID);

  const leads = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const lead = rowToLead(rows[i], createdBy);
    if (lead) {
      leads.push(lead);
    } else {
      skipped.push(i + 2); // +2 for 1-based + header
    }
  }

  console.log(`✅  Valid leads to insert: ${leads.length}`);
  console.log(`⚠️   Skipped rows (no name or phone): ${skipped.length}${skipped.length ? ' → rows: ' + skipped.join(', ') : ''}\n`);

  // Insert — skip duplicates by mobileNumber using ordered:false
  let inserted = 0;
  let duplicates = 0;
  const errors = [];

  for (const leadData of leads) {
    try {
      await Lead.create(leadData);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        duplicates++;
      } else {
        errors.push({ name: leadData.fullName, error: err.message });
      }
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Inserted:   ${inserted}`);
  console.log(`Duplicates: ${duplicates} (already exist, skipped)`);
  console.log(`Errors:     ${errors.length}`);
  if (errors.length) {
    errors.forEach(e => console.error(`  - ${e.name}: ${e.error}`));
  }
  console.log(`──────────────────────────────\n`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
