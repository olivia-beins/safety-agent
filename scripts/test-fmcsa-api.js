/**
 * Quick test script for Transportation.gov FMCSA API
 */

const DOT_NUMBER = process.argv[2] || '1788847';
const API_BASE = 'https://data.transportation.gov/api/views/fx4q-ay7w';

async function testAPI() {
  console.log(`\n🔍 Testing FMCSA API for DOT: ${DOT_NUMBER}\n`);
  
  const query = `$where=DOT_NUMBER='${DOT_NUMBER}'&$order=INSP_DATE DESC&$limit=10`;
  const url = `${API_BASE}/rows.json?${query}`;
  
  console.log(`📡 URL: ${url}\n`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const elapsed = Date.now() - startTime;
    
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    
    // Check response structure
    console.log(`📦 Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
    console.log(`🔑 Top-level keys: ${Object.keys(data).slice(0, 10).join(', ')}\n`);
    
    // Find the actual data array
    let inspections = [];
    if (Array.isArray(data)) {
      inspections = data;
    } else if (data.data && Array.isArray(data.data)) {
      inspections = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      inspections = data.results;
    } else {
      // Try to find any array in the response
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          inspections = data[key];
          console.log(`📋 Found data array in key: ${key}`);
          break;
        }
      }
    }
    
    console.log(`✅ Found ${inspections.length} inspection record(s)\n`);
    
    if (inspections.length > 0) {
      const first = inspections[0];
      console.log(`📄 Sample record keys: ${Object.keys(first).slice(0, 20).join(', ')}\n`);
      
      console.log(`📋 First inspection record:`);
      console.log(`   DOT_NUMBER: ${first.DOT_NUMBER || first.dot_number || 'N/A'}`);
      console.log(`   INSP_DATE: ${first.INSP_DATE || first.insp_date || 'N/A'}`);
      console.log(`   INSPECTION_ID: ${first.INSPECTION_ID || first.inspection_id || 'N/A'}`);
      console.log(`   VEHICLE_OOS_TOTAL: ${first.VEHICLE_OOS_TOTAL || first.vehicle_oos_total || 0}`);
      console.log(`   DRIVER_OOS_TOTAL: ${first.DRIVER_OOS_TOTAL || first.driver_oos_total || 0}`);
      console.log(`   OOS_TOTAL: ${first.OOS_TOTAL || first.oos_total || 0}`);
      console.log(`   REPORT_STATE: ${first.REPORT_STATE || first.report_state || 'N/A'}\n`);
      
      // Show all OOS violations
      const oosInspections = inspections.filter(insp => {
        const oos = insp.OOS_TOTAL || insp.oos_total || 0;
        return parseInt(String(oos), 10) > 0;
      });
      
      if (oosInspections.length > 0) {
        console.log(`⚠️  Found ${oosInspections.length} inspection(s) with OOS violations:\n`);
        oosInspections.slice(0, 3).forEach((insp, idx) => {
          console.log(`   ${idx + 1}. Date: ${insp.INSP_DATE || insp.insp_date || 'N/A'}`);
          console.log(`      Vehicle OOS: ${insp.VEHICLE_OOS_TOTAL || insp.vehicle_oos_total || 0}`);
          console.log(`      Driver OOS: ${insp.DRIVER_OOS_TOTAL || insp.driver_oos_total || 0}`);
          console.log(`      Total OOS: ${insp.OOS_TOTAL || insp.oos_total || 0}\n`);
        });
      } else {
        console.log(`ℹ️  No OOS violations found in these inspections\n`);
      }
    } else {
      console.log(`ℹ️  No inspections found for DOT ${DOT_NUMBER}`);
      console.log(`   This could mean:`);
      console.log(`   - The DOT number has no inspection records`);
      console.log(`   - The API response format is different than expected`);
      console.log(`   - The query syntax needs adjustment\n`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

testAPI();

