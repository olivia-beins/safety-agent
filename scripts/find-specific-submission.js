/**
 * Script to find a specific submission and check why it might not be in the list
 * Usage: node scripts/find-specific-submission.js [formId] [submissionId]
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
const submissionId = process.argv[3] || 'd2cb9204-afb3-4099-86cb-4f8b6b4205a0';

async function searchForSubmission(formId, submissionId) {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured in .env.local');
  }

  console.log(`Searching for submission ${submissionId} in form ${formId}\n`);

  // First, try to get all submissions with different filters
  const filters = [
    { limit: 150 }, // Default
    { limit: 150, status: 'complete' },
    { limit: 150, status: 'submitted' },
    { limit: 150, status: 'draft' },
  ];

  for (const filter of filters) {
    console.log(`Trying filter: ${JSON.stringify(filter)}`);
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      params.append(key, String(value));
    });

    let response = await fetch(
      `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok && response.status === 404) {
      response = await fetch(
        `${FILLOUT_API_BASE}/v1/forms/${formId}/submissions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (response.ok) {
      const data = await response.json();
      const submissions = data.responses || data.submissions || [];
      console.log(`  Found ${submissions.length} submissions with this filter`);

      const found = submissions.find((s) => {
        const id1 = s.submissionId;
        const id2 = s.id;
        return id1 === submissionId || id2 === submissionId || String(id1) === submissionId || String(id2) === submissionId;
      });

      if (found) {
        console.log(`  ✅ FOUND IT with filter: ${JSON.stringify(filter)}`);
        console.log(`  Submission details:`, JSON.stringify(found, null, 2));
        return found;
      }
    } else {
      console.log(`  Error: ${response.status}`);
    }
  }

  // Try direct submission endpoint
  console.log(`\nTrying direct submission endpoint...`);
  let directResponse = await fetch(
    `${FILLOUT_API_BASE}/v1/api/submissions/${submissionId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!directResponse.ok && directResponse.status === 404) {
    directResponse = await fetch(
      `${FILLOUT_API_BASE}/v1/submissions/${submissionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (directResponse.ok) {
    const submission = await directResponse.json();
    console.log(`  ✅ Found via direct endpoint`);
    console.log(`  Submission formId: ${submission.formId || submission.form?.id || 'unknown'}`);
    console.log(`  Submission details:`, JSON.stringify(submission, null, 2));
    return submission;
  } else {
    const errorText = await directResponse.text();
    console.log(`  Direct endpoint error: ${directResponse.status} - ${errorText}`);
  }

  // Try paginating through ALL submissions
  console.log(`\nPaginating through ALL submissions...`);
  let allSubmissions = [];
  let after = undefined;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    const params = new URLSearchParams();
    params.append('limit', '150');
    if (after) {
      params.append('after', after);
    }

    let response = await fetch(
      `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok && response.status === 404) {
      response = await fetch(
        `${FILLOUT_API_BASE}/v1/forms/${formId}/submissions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (response.ok) {
      const data = await response.json();
      const submissions = data.responses || data.submissions || [];
      allSubmissions = allSubmissions.concat(submissions);
      console.log(`  Page ${page}: ${submissions.length} submissions (Total: ${allSubmissions.length})`);

      const found = submissions.find((s) => {
        const id1 = s.submissionId;
        const id2 = s.id;
        return id1 === submissionId || id2 === submissionId || String(id1) === submissionId || String(id2) === submissionId;
      });

      if (found) {
        console.log(`  ✅ FOUND IT on page ${page}!`);
        return found;
      }

      hasMore = submissions.length === 150;
      if (hasMore && submissions.length > 0) {
        after = submissions[submissions.length - 1].submissionId || submissions[submissions.length - 1].id;
        page++;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`\n❌ Submission not found after checking ${allSubmissions.length} total submissions`);
  console.log(`Submission IDs found:`, allSubmissions.map(s => s.submissionId || s.id).slice(0, 10));
  return null;
}

async function main() {
  try {
    const result = await searchForSubmission(formId, submissionId);
    if (!result) {
      console.log('\nThe submission might be:');
      console.log('- In a different form');
      console.log('- Filtered out by status (draft, deleted, etc.)');
      console.log('- Not accessible via API (permissions issue)');
      console.log('- Using a different ID format in the UI vs API');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
