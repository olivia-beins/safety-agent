/**
 * Quick test script for Transportation.gov FMCSA API
 */

const DOT_NUMBER = process.argv[2] || '1788847';
const API_BASE = 'https://data.transportation.gov/api/views/fx4q-ay7w';

async function testAPI() {
  console.log(`\n🔍 Testing FMCSA API for DOT: ${DOT_NUMBER}\n`);
  
  const query = `$where=DOT_NUMBER='${DOT_NUMBER}'&$limit=5`;
  const url = `${API_BASE}/rows.json?${query}`;
  
  console.log(`📡 Fetching: ${url.substring(0, 80)}...\n`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const startTime = Date.now();
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText.substring(0, 200)}`);
      return;
    }
    
    const data = await response.json();
    
    // Check response structure
    if (Array.isArray(data)) {
      console.log(`✅ Response is an array with ${data.length} records\n`);
      if (data.length > 0) {
        const first = data[0];
        console.log(`📄 First record sample:`);
        console.log(JSON.stringify({
          DOT_NUMBER: first.DOT_NUMBER,
          INSP_DATE: first.INSP_DATE,
          INSPECTION_ID: first.INSPECTION_ID,
          VEHICLE_OOS_TOTAL: first.VEHICLE_OOS_TOTAL,
          DRIVER_OOS_TOTAL: first.DRIVER_OOS_TOTAL,
          OOS_TOTAL: first.OOS_TOTAL,
        }, null, 2));
      }
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`✅ Response has data array with ${data.data.length} records\n`);
      if (data.data.length > 0) {
        const first = data.data[0];
        console.log(`📄 First record sample:`);
        console.log(JSON.stringify({
          DOT_NUMBER: first.DOT_NUMBER,
          INSP_DATE: first.INSP_DATE,
          INSPECTION_ID: first.INSPECTION_ID,
          VEHICLE_OOS_TOTAL: first.VEHICLE_OOS_TOTAL,
          DRIVER_OOS_TOTAL: first.DRIVER_OOS_TOTAL,
          OOS_TOTAL: first.OOS_TOTAL,
        }, null, 2));
      }
    } else {
      console.log(`📦 Response structure:`);
      console.log(`   Type: ${typeof data}`);
      console.log(`   Keys: ${Object.keys(data).slice(0, 10).join(', ')}\n`);
      console.log(`   Full response (first 500 chars):`);
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`\n❌ Request timed out after 10 seconds`);
    } else {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }
}

testAPI();

