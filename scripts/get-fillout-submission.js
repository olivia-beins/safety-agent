/**
 * Quick script to get a Fillout submission ID for testing
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

if (!apiKey) {
  console.error('FILLOUT_API_KEY not found in environment');
  process.exit(1);
}

async function getSubmissions() {
  // Try to get submissions from the "Nirvana Welcome" form
  const formId = 'adq2KSi5G9us';
  
  // Try both endpoint variations
  let response = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=5`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`https://api.fillout.com/v1/forms/${formId}/submissions?limit=5`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (!response.ok) {
    const error = await response.json();
    console.error('Error fetching submissions:', error);
    process.exit(1);
  }

  const data = await response.json();
  
  // Log the structure to debug
  console.log('\n📋 Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
  
  const submissions = data.responses || data.submissions || data.data || [];
  
  if (submissions.length > 0) {
    console.log('\n✅ Found submissions! Here are the submission IDs:\n');
    submissions.forEach((submission, index) => {
      const id = submission.id || submission.submissionId || submission._id;
      const created = submission.createdAt || submission.created_at || submission.dateCreated;
      const status = submission.status || submission.state;
      
      console.log(`${index + 1}. Submission ID: ${id || 'N/A'}`);
      console.log(`   Created: ${created || 'N/A'}`);
      console.log(`   Status: ${status || 'N/A'}`);
      console.log(`   Full keys: ${Object.keys(submission).join(', ')}\n`);
    });
    
    // Return the first one
    const firstSubmission = submissions[0];
    return firstSubmission.id || firstSubmission.submissionId || firstSubmission._id;
  } else {
    console.log('\n⚠️  No submissions found for this form.');
    console.log('You can create a test submission by filling out the form at:');
    console.log(`https://form.fillout.com/t/${formId}\n`);
    return null;
  }
}

getSubmissions()
  .then((submissionId) => {
    if (submissionId) {
      console.log(`\n🎯 Use this submission ID for testing: ${submissionId}\n`);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

