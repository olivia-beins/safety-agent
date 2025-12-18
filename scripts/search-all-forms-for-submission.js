/**
 * Script to search ALL forms for a specific submission ID
 * Usage: node scripts/search-all-forms-for-submission.js [submissionId]
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
const submissionId = process.argv[2] || 'd2cb9204-afb3-4099-86cb-4f8b6b4205a0';

async function getAllForms() {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured in .env.local');
  }

  let response = await fetch(`${FILLOUT_API_BASE}/v1/api/forms?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

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
  const forms = Array.isArray(data) ? data : (data.forms || data.data || []);
  return forms.map((f) => ({
    formId: f.formId || f.id,
    name: f.name || 'Unknown',
  }));
}

async function searchFormForSubmission(formId, formName, submissionId) {
  const apiKey = process.env.FILLOUT_API_KEY;
  
  // Check both finished and in_progress statuses
  const statuses = ['finished', 'in_progress'];

  for (const status of statuses) {
    let allSubmissions = [];
    let after = undefined;
    let hasMore = true;
    let page = 1;

    while (hasMore) {
      const urlParams = new URLSearchParams();
      urlParams.append('limit', '150');
      urlParams.append('status', status);
      if (after) {
        urlParams.append('after', after);
      }

      let response = await fetch(
        `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?${urlParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok && response.status === 404) {
        response = await fetch(
          `${FILLOUT_API_BASE}/v1/forms/${formId}/submissions?${urlParams.toString()}`,
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

        const found = submissions.find((s) => {
          const id1 = s.submissionId;
          const id2 = s.id;
          return id1 === submissionId || id2 === submissionId || 
                 String(id1) === submissionId || String(id2) === submissionId;
        });

        if (found) {
          return { found: true, formId, formName, submission: found, status };
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
  }

  return { found: false, formId, formName };
}

async function main() {
  try {
    console.log(`Searching for submission: ${submissionId}\n`);
    
    const forms = await getAllForms();
    console.log(`Searching through ${forms.length} forms...\n`);

    for (const form of forms) {
      process.stdout.write(`Checking ${form.name} (${form.formId})... `);
      const result = await searchFormForSubmission(form.formId, form.name, submissionId);
      
      if (result.found) {
        console.log(`✅ FOUND!`);
        console.log(`\nSubmission found in form: ${result.formName}`);
        console.log(`Form ID: ${result.formId}`);
        console.log(`Submission ID: ${result.submission.submissionId || result.submission.id}`);
        console.log(`Created: ${result.submission.submissionTime || result.submission.createdAt || 'Unknown'}`);
        return;
      } else {
        console.log(`not found`);
      }
    }

    console.log(`\n❌ Submission ${submissionId} not found in any form.`);
    console.log(`\nPossible reasons:`);
    console.log(`- The submission might be in draft status and filtered by the API`);
    console.log(`- The submission might have been deleted`);
    console.log(`- The API key might not have access to this submission`);
    console.log(`- The submission ID in the UI might be different from the API ID`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
