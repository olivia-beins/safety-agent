/**
 * Search all forms for a specific submission ID
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
    // Check different possible response structures
    const forms = data.forms || data.data || (Array.isArray(data) ? data : []);
    console.log(`API response structure:`, Object.keys(data));
    return forms;
  }
  return [];
}

async function searchAllForms() {
  console.log(`\n🔍 Searching for submission: ${submissionId}\n`);
  
  const allForms = await getAllForms();
  console.log(`Found ${allForms.length} forms to search\n`);

  for (const form of allForms) {
    const formId = form.formId || form.id;
    const formName = form.name || 'Unknown';
    
    console.log(`Checking form: ${formName} (${formId})...`);
    
    let response = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=150`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status === 404) {
      response = await fetch(`https://api.fillout.com/v1/forms/${formId}/submissions?limit=150`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (response.ok) {
      const data = await response.json();
      const submissions = data.responses || data.submissions || [];
      
      const found = submissions.find((s) => {
        const id = s.submissionId || s.id || String(s._id);
        return id === submissionId;
      });
      
      if (found) {
        console.log(`\n✅ FOUND IT!`);
        console.log(`   Form: ${formName} (${formId})`);
        console.log(`   Submission ID: ${found.submissionId || found.id}`);
        console.log(`   Submitted: ${found.submissionTime || found.createdAt || 'N/A'}`);
        return { formId, formName, submission: found };
      } else {
        console.log(`   (${submissions.length} submissions, not found)`);
      }
    } else {
      const error = await response.json().catch(() => ({}));
      console.log(`   ⚠️  Error: ${response.status} - ${error.message || 'Unknown error'}`);
    }
  }
  
  console.log(`\n❌ Submission not found in any form`);
  return null;
}

searchAllForms()
  .then((result) => {
    if (result) {
      console.log(`\n🎯 Submission found in form: ${result.formId}`);
      console.log(`   Use this formId when searching: ?formId=${result.formId}\n`);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

