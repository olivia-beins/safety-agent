/**
 * Debug script to see what the API actually returns and check for hidden parameters
 * Usage: node scripts/debug-form-submissions.js [formId]
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
const formId = process.argv[2] || 'aUQeuCHHexus';

async function debugFormSubmissions(formId) {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured in .env.local');
  }

  console.log(`Debugging form: ${formId}\n`);

  // Try the basic endpoint and see the full response
  let response = await fetch(
    `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?limit=150`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${FILLOUT_API_BASE}/v1/forms/${formId}/submissions?limit=150`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error: ${response.status} - ${errorText}`);
    return;
  }

  const data = await response.json();
  console.log('Full API Response Structure:');
  console.log('Top-level keys:', Object.keys(data));
  console.log('\nResponse sample (first 2000 chars):');
  console.log(JSON.stringify(data, null, 2).substring(0, 2000));
  
  const submissions = data.responses || data.submissions || [];
  console.log(`\n\nTotal submissions in response: ${submissions.length}`);
  
  if (data.pageCount !== undefined) {
    console.log(`Page count: ${data.pageCount}`);
  }
  if (data.totalResponses !== undefined) {
    console.log(`Total responses (from API): ${data.totalResponses}`);
  }
  if (data.totalPages !== undefined) {
    console.log(`Total pages: ${data.totalPages}`);
  }

  console.log('\nSubmission IDs found:');
  submissions.forEach((s, i) => {
    const id = s.submissionId || s.id;
    const status = s.status || 'unknown';
    const createdAt = s.submissionTime || s.createdAt || s.startedAt;
    console.log(`  ${i + 1}. ${id} (status: ${status}, created: ${createdAt ? new Date(createdAt).toISOString() : 'unknown'})`);
  });

  // Check if there's pagination info
  if (data.pageCount && data.pageCount > 1) {
    console.log(`\n⚠️  WARNING: There are ${data.pageCount} pages, but we only fetched the first page!`);
    console.log('We need to paginate through all pages.');
  }
}

async function main() {
  try {
    await debugFormSubmissions(formId);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
