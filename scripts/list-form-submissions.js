/**
 * Script to list all submissions for a specific Fillout form
 * Usage: node scripts/list-form-submissions.js [formId]
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

async function getSubmissions(formId, status = 'finished') {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured in .env.local');
  }

  let allSubmissions = [];
  let after = undefined;
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    const params = new URLSearchParams();
    params.append('limit', '150');
    params.append('status', status); // 'finished' or 'in_progress'
    if (after) {
      params.append('after', after);
    }

    // Try /v1/api/forms/{formId}/submissions first
    let response = await fetch(
      `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // If that fails, try without /api
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch submissions: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const submissions = data.responses || data.submissions || [];
    allSubmissions = allSubmissions.concat(submissions);

    console.log(`Page ${page} (${status}): Fetched ${submissions.length} submissions (Total: ${allSubmissions.length})`);

    // Check for pagination - Fillout uses cursor-based pagination
    hasMore = submissions.length === 150;
    if (hasMore && submissions.length > 0) {
      // Use the last submission's ID as the cursor for next page
      after = submissions[submissions.length - 1].submissionId || submissions[submissions.length - 1].id;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allSubmissions;
}

async function main() {
  try {
    console.log(`Fetching submissions for form: ${formId}\n`);
    
    // Fetch both finished and in_progress submissions
    console.log('Fetching completed submissions...');
    const finishedSubmissions = await getSubmissions(formId, 'finished');
    
    console.log('\nFetching draft/in-progress submissions...');
    const inProgressSubmissions = await getSubmissions(formId, 'in_progress');
    
    const allSubmissions = [...finishedSubmissions, ...inProgressSubmissions];

    if (allSubmissions.length === 0) {
      console.log('No submissions found for this form.');
      return;
    }

    console.log(`\nFound ${allSubmissions.length} total submission(s) (${finishedSubmissions.length} completed, ${inProgressSubmissions.length} in progress):\n`);
    allSubmissions.forEach((submission, index) => {
      const submissionId = submission.submissionId || submission.id;
      const createdAt = submission.submissionTime || submission.createdAt || submission.startedAt;
      const dateStr = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown date';
      const status = submission.status || (inProgressSubmissions.includes(submission) ? 'in_progress' : 'finished');
      
      console.log(`${index + 1}. Submission ID: ${submissionId}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${dateStr}`);
      
      // Try to extract some key information if available
      if (submission.questions && Array.isArray(submission.questions)) {
        const dotField = submission.questions.find(q => 
          (q.name && q.name.toLowerCase().includes('dot')) ||
          (q.value && String(q.value).match(/\d+/))
        );
        if (dotField && dotField.value) {
          console.log(`   DOT Number: ${dotField.value}`);
        }
      }
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
