/**
 * Script to list all Fillout forms
 * Usage: node scripts/list-fillout-forms.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const FILLOUT_API_BASE = 'https://api.fillout.com';

async function getAllForms() {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured in .env.local');
  }

  // Try /v1/api/forms first
  let response = await fetch(`${FILLOUT_API_BASE}/v1/api/forms?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  // If that fails, try without /api
  if (!response.ok && response.status === 404) {
    response = await fetch(`${FILLOUT_API_BASE}/v1/forms?limit=100`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch forms: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // The API returns an array directly
  const forms = Array.isArray(data) ? data : (data.forms || data.data || []);
  return forms.map((f) => ({
    formId: f.formId || f.id,
    name: f.name || 'Unknown',
  }));
}

async function main() {
  try {
    console.log('Fetching Fillout forms...\n');
    const forms = await getAllForms();
    
    if (forms.length === 0) {
      console.log('No forms found.');
      return;
    }

    console.log(`Found ${forms.length} form(s):\n`);
    forms.forEach((form, index) => {
      console.log(`${index + 1}. ${form.name}`);
      console.log(`   Form ID: ${form.formId}\n`);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
