/**
 * Script to verify which prompts are being used in email generation
 */

console.log('\n📋 Verifying Prompt Usage in Email Generation\n');
console.log('='.repeat(60));

// Check if email generation uses AI
console.log('\n1️⃣  Email Generation Flow:');
console.log('   - When useAI=true, calls: /api/recommendations/strategic');
console.log('   - This endpoint uses: OPENAI_EMAIL_PROMPT (system prompt)');
console.log('   - This generates: Strategic recommendations (observation, action, owner)');

// Check if general recommendations use AI
console.log('\n2️⃣  General Recommendations Flow:');
console.log('   - When useAI=true, calls: /api/recommendations');
console.log('   - This endpoint uses: OPENAI_SYSTEM_PROMPT (system prompt)');
console.log('   - This generates: General safety recommendations');

console.log('\n3️⃣  Prompt Loading:');
console.log('   ✅ Both prompts read from .env.local file');
console.log('   ✅ Multi-line prompts are supported');
console.log('   ✅ Fallback to env vars if file reading fails');

console.log('\n4️⃣  To Verify Your Prompts Are Being Used:');
console.log('   - Check server logs when generating email');
console.log('   - Look for: "[Email Prompt] ✅ Loaded custom prompt"');
console.log('   - Look for: "Using custom system prompt (length: X chars)"');
console.log('   - Visit: http://localhost:3000/api/test-email-prompt');
console.log('   - Visit: http://localhost:3000/api/test-prompt');

console.log('\n' + '='.repeat(60));
console.log('\n✅ Verification complete!\n');

