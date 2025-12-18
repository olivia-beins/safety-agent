/**
 * List all submission IDs from a specific form
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

const apiKey = process.env.FILLOUT_API_KEY;
const formId = process.argv[2] || 'aUQeuCHHexus';

if (!apiKey) {
  console.error('FILLOUT_API_KEY not found');
  process.exit(1);
}

async function listAllSubmissions() {
  console.log(`\n📋 Listing all submissions from form: ${formId}\n`);
  
  let allSubmissions = [];
  let after = undefined;
  let page = 1;
  
  while (true) {
    const params = new URLSearchParams();
    params.append('limit', '150');
    if (after) {
      params.append('after', after);
    }
    
    let response = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status === 404) {
      response = await fetch(`https://api.fillout.com/v1/forms/${formId}/submissions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`Error ${response.status}:`, error);
      break;
    }

    const data = await response.json();
    const submissions = data.responses || data.submissions || [];
    allSubmissions = allSubmissions.concat(submissions);
    
    console.log(`Page ${page}: ${submissions.length} submissions`);
    
    if (submissions.length < 150) {
      break;
    }
    
    if (submissions.length > 0) {
      after = submissions[submissions.length - 1].submissionId || submissions[submissions.length - 1].id;
    } else {
      break;
    }
    
    page++;
    
    if (page > 20) {
      console.log('Stopped after 20 pages (safety limit)');
      break;
    }
  }
  
  console.log(`\n✅ Total submissions: ${allSubmissions.length}\n`);
  console.log('All Submission IDs:\n');
  allSubmissions.forEach((s, i) => {
    const id = s.submissionId || s.id || String(s._id || '');
    const date = s.submissionTime || s.createdAt || s.startedAt || 'N/A';
    console.log(`${i + 1}. ${id} (${date})`);
  });
  
  console.log(`\n📋 Use any of these submission IDs to test\n`);
}

listAllSubmissions().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

