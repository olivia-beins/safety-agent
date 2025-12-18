/**
 * Test the FMCSA API with the provided API key
 */

const API_KEY = '28q1mj65zq3ole2k8tp27rglwvb4dj7tcib6558or24zrzvy03';
const DOT_NUMBER = process.argv[2] || '1788847';

async function testAPI() {
  console.log(`\n🔑 Testing FMCSA API with API key for DOT: ${DOT_NUMBER}\n`);
  
  // Test v3 endpoint with SoQL query
  const soql = `SELECT DOT_NUMBER,INSP_DATE,OOS_TOTAL WHERE DOT_NUMBER='${DOT_NUMBER}' LIMIT 2`;
  const url = `https://data.transportation.gov/api/v3/views/fx4q-ay7w/query.json?$query=${encodeURIComponent(soql)}`;
  
  console.log(`📡 URL: ${url.substring(0, 100)}...\n`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText.substring(0, 300)}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Response received!`);
    console.log(`📦 Response keys: ${Object.keys(data).join(', ')}\n`);
    
    // Check for data
    let records = [];
    if (data.data && Array.isArray(data.data)) {
      records = data.data;
    } else if (Array.isArray(data)) {
      records = data;
    } else if (data.results && Array.isArray(data.results)) {
      records = data.results;
    }
    
    console.log(`📋 Found ${records.length} record(s)\n`);
    
    if (records.length > 0) {
      console.log(`📄 First record:`);
      console.log(JSON.stringify(records[0], null, 2));
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

testAPI();

