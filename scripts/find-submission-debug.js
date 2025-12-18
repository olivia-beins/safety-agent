/**
 * Debug script to find a submission with detailed logging
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
const submissionId = 'c2dce870-9a86-4ce8-a0da-c5ca8321a5ac';

if (!apiKey) {
  console.error('FILLOUT_API_KEY not found');
  process.exit(1);
}

async function getAllForms() {
  let response = await fetch('https://api.fillout.com/v1/api/forms?limit=100', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status === 404) {
    response = await fetch('https://api.fillout.com/v1/forms?limit=100', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (response.ok) {
    const data = await response.json();
    // Handle array response
    if (Array.isArray(data)) {
      return data;
    }
    return data.forms || data.data || [];
  }
  return [];
}

async function searchFormWithPagination(formId, formName) {
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
      console.log(`    Error ${response.status}`);
      break;
    }

    const data = await response.json();
    const submissions = data.responses || data.submissions || [];
    allSubmissions = allSubmissions.concat(submissions);
    
    console.log(`    Page ${page}: ${submissions.length} submissions (total: ${allSubmissions.length})`);
    
    // Check if we found it
    const found = submissions.find((s) => {
      const id1 = s.submissionId;
      const id2 = s.id;
      const id3 = String(s._id || '');
      return id1 === submissionId || id2 === submissionId || id3 === submissionId ||
             String(id1) === submissionId || String(id2) === submissionId;
    });
    
    if (found) {
      console.log(`    ✅ FOUND ON PAGE ${page}!`);
      return { found: true, submission: found };
    }
    
    // Check for more pages
    if (submissions.length < 150) {
      break; // No more pages
    }
    
    // Set cursor for next page
    if (submissions.length > 0) {
      after = submissions[submissions.length - 1].submissionId || submissions[submissions.length - 1].id;
    } else {
      break;
    }
    
    page++;
    
    // Safety limit
    if (page > 10) {
      console.log(`    ⚠️  Stopped after 10 pages (safety limit)`);
      break;
    }
  }
  
  return { found: false, total: allSubmissions.length };
}

async function searchAllForms() {
  console.log(`\n🔍 Searching for submission: ${submissionId}\n`);
  
  const allForms = await getAllForms();
  console.log(`Found ${allForms.length} forms\n`);

  for (const form of allForms) {
    const formId = form.formId || form.id;
    const formName = form.name || 'Unknown';
    
    console.log(`Checking: ${formName} (${formId})`);
    
    const result = await searchFormWithPagination(formId, formName);
    
    if (result.found) {
      console.log(`\n✅ FOUND IT!`);
      console.log(`   Form: ${formName} (${formId})`);
      console.log(`   Submission ID: ${result.submission.submissionId || result.submission.id}`);
      return { formId, formName, submission: result.submission };
    } else {
      console.log(`   Total submissions checked: ${result.total}`);
    }
  }
  
  console.log(`\n❌ Submission not found in any form`);
  return null;
}

searchAllForms()
  .then((result) => {
    if (result) {
      console.log(`\n🎯 Use formId: ${result.formId}\n`);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

