/**
 * Script to find a Fillout submission that has a DOT number filled in
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

async function findSubmissionWithDOT() {
  const formIds = ['adq2KSi5G9us', 'aUQeuCHHexus', 'ryV6iR7wZhus'];
  
  for (const formId of formIds) {
    console.log(`\n🔍 Checking form: ${formId}...`);
    
    // Try /v1/api/forms/{formId}/submissions first
    let response = await fetch(`https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=100`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // If that fails, try without /api
    if (!response.ok && response.status === 404) {
      response = await fetch(`https://api.fillout.com/v1/forms/${formId}/submissions?limit=100`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (response.ok) {
      const data = await response.json();
      const submissions = data.responses || data.submissions || [];
      
      console.log(`   Found ${submissions.length} submissions`);
      
      for (const submission of submissions) {
        // Look for DOT number in questions
        const questions = submission.questions || [];
        const dotQuestion = questions.find((q) => {
          const name = (q.name || '').toLowerCase();
          return name.includes('dot');
        });
        
        if (dotQuestion && dotQuestion.value !== null && dotQuestion.value !== undefined && dotQuestion.value !== '') {
          const dotValue = String(dotQuestion.value).replace(/\D/g, '');
          if (dotValue) {
            console.log(`\n✅ FOUND SUBMISSION WITH DOT NUMBER!`);
            console.log(`   Submission ID: ${submission.submissionId || submission.id}`);
            console.log(`   DOT Number: ${dotValue}`);
            console.log(`   Form ID: ${formId}`);
            console.log(`   Submitted: ${submission.submissionTime || submission.createdAt || 'N/A'}`);
            
            // Show other fields too
            const companyName = questions.find((q) => {
              const name = (q.name || '').toLowerCase();
              return name.includes('company');
            });
            if (companyName && companyName.value) {
              console.log(`   Company Name: ${companyName.value}`);
            }
            
            return {
              submissionId: submission.submissionId || submission.id,
              dotNumber: dotValue,
              formId: formId,
            };
          }
        }
      }
    } else {
      console.log(`   ⚠️  Could not fetch submissions (status: ${response.status})`);
    }
  }
  
  console.log(`\n❌ No submissions with DOT numbers found in the checked forms.`);
  return null;
}

findSubmissionWithDOT()
  .then((result) => {
    if (result) {
      console.log(`\n🎯 Use this submission ID for testing: ${result.submissionId}`);
      console.log(`   DOT Number: ${result.dotNumber}`);
      console.log(`   Form ID: ${result.formId}\n`);
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

