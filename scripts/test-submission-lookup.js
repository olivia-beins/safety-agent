/**
 * Test script to find a specific submission
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
const formId = 'aUQeuCHHexus';

if (!apiKey) {
  console.error('FILLOUT_API_KEY not found');
  process.exit(1);
}

async function findSubmission() {
  console.log(`\n🔍 Looking for submission: ${submissionId}`);
  console.log(`📋 Searching in form: ${formId}\n`);

  // Try to get submissions from the specific form (max limit is 150)
  let response = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=150`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status === 404) {
    response = await fetch(`https://api.fillout.com/v1/forms/${formId}/submissions?limit=200`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ Error fetching submissions:', error);
    console.error(`Status: ${response.status}`);
    process.exit(1);
  }

  const data = await response.json();
  const submissions = data.responses || data.submissions || [];
  
  console.log(`✅ Found ${submissions.length} submissions in form ${formId}\n`);

  // Look for the specific submission
  const found = submissions.find((s) => {
    const id = s.submissionId || s.id || String(s._id);
    return id === submissionId;
  });

  if (found) {
    console.log('✅ FOUND THE SUBMISSION!\n');
    console.log(`Submission ID: ${found.submissionId || found.id}`);
    console.log(`Submitted: ${found.submissionTime || found.createdAt || 'N/A'}`);
    console.log(`Questions: ${found.questions?.length || 0}`);
    
    // Check for DOT number
    const dotQuestion = found.questions?.find((q) => {
      const name = (q.name || '').toLowerCase();
      return name.includes('dot');
    });
    
    if (dotQuestion) {
      console.log(`\nDOT Number field found:`);
      console.log(`  Name: ${dotQuestion.name}`);
      console.log(`  Value: ${dotQuestion.value || 'EMPTY'}`);
    } else {
      console.log(`\n⚠️  No DOT number field found in questions`);
    }
    
    // List all question names
    console.log(`\nAll question names:`);
    found.questions?.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.name} (${q.type}) - Value: ${q.value !== null && q.value !== undefined ? q.value : 'EMPTY'}`);
    });
  } else {
    console.log('❌ Submission not found in this form\n');
    console.log('Available submission IDs (first 10):');
    submissions.slice(0, 10).forEach((s, i) => {
      const id = s.submissionId || s.id || String(s._id);
      console.log(`  ${i + 1}. ${id}`);
    });
  }
}

findSubmission().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

