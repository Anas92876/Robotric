const { createClient } = require('@supabase/supabase-js');
const dns = require('node:dns');

// Fix for "fetch failed" in some Node.js environments (prefer IPv4)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found in environment variables');
  console.warn('   PDF upload functionality will not work without SUPABASE_URL and SUPABASE_KEY');
} else {
  // Validate URL format
  try {
    const url = new URL(supabaseUrl);
    console.log(`✅ Supabase configuration detected: ${url.hostname}`);
    
    // Perform an async connectivity check (non-blocking for module export)
    fetch(`${supabaseUrl}/storage/v1/health`, { method: 'GET' })
      .then(res => {
        if (res.ok) console.log('📡 Supabase Storage API is reachable');
        else console.warn(`⚠️ Supabase Health Check: ${res.status} ${res.statusText}`);
      })
      .catch(err => {
        console.error('📡 Supabase Connection Test Failed:', err.message);
        if (err.cause) console.error('   Cause:', err.cause.message || err.cause);
      });
  } catch (e) {
    console.error('❌ Invalid SUPABASE_URL format:', supabaseUrl);
    console.warn('   Ensure the URL starts with https://');
  }
}

// Custom fetch with 10-minute timeout for slow connections (Syria)
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { global: { fetch: fetchWithTimeout } })
  : null;

module.exports = supabase;
