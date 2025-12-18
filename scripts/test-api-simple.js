/**
 * Simple test of FMCSA API
 */

const DOT_NUMBER = process.argv[2] || '1788847';

async function testAPI() {
  console.log(`\n🧪 Testing FMCSA API for DOT: ${DOT_NUMBER}\n`);
  
  // Test direct API call
  const selectColumns = 'DOT_NUMBER,INSP_DATE,INSPECTION_ID,VEHICLE_OOS_TOTAL,DRIVER_OOS_TOTAL,HAZMAT_OOS_TOTAL,OOS_TOTAL';
  const query = `$select=${selectColumns}&$where=DOT_NUMBER='${DOT_NUMBER}'&$order=INSP_DATE DESC&$limit=10`;
  const url = `https://data.transportation.gov/resource/fx4q-ay7w.json?${query}`;
  
  console.log(`📡 Calling API...`);
  const start = Date.now();
  
  try {
    const response = await fetch(url);
    const elapsed = Date.now() - start;
    
    console.log(`⏱️  Response time: ${elapsed}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Success! Found ${data.length} inspection record(s)\n`);
    
    if (data.length > 0) {
      // Count OOS violations
      const withOOS = data.filter(r => {
        const total = parseInt(r.OOS_TOTAL || '0', 10);
        const vehicle = parseInt(r.VEHICLE_OOS_TOTAL || '0', 10);
        const driver = parseInt(r.DRIVER_OOS_TOTAL || '0', 10);
        const hazmat = parseInt(r.HAZMAT_OOS_TOTAL || '0', 10);
        return total > 0 || vehicle > 0 || driver > 0 || hazmat > 0;
      });
      
      console.log(`📋 Inspection Summary:`);
      console.log(`   Total inspections: ${data.length}`);
      console.log(`   With OOS violations: ${withOOS.length}`);
      console.log(`   Clean inspections: ${data.length - withOOS.length}\n`);
      
      if (withOOS.length > 0) {
        console.log(`⚠️  OOS Violations Found:\n`);
        withOOS.slice(0, 5).forEach((insp, i) => {
          console.log(`   ${i + 1}. Date: ${insp.INSP_DATE}`);
          console.log(`      Vehicle OOS: ${insp.VEHICLE_OOS_TOTAL || 0}`);
          console.log(`      Driver OOS: ${insp.DRIVER_OOS_TOTAL || 0}`);
          console.log(`      Hazmat OOS: ${insp.HAZMAT_OOS_TOTAL || 0}`);
          console.log(`      Total OOS: ${insp.OOS_TOTAL || 0}\n`);
        });
      } else {
        console.log(`ℹ️  No OOS violations found in recent inspections\n`);
      }
      
      // Show most recent inspection
      console.log(`📄 Most Recent Inspection:`);
      const mostRecent = data[0];
      console.log(`   Date: ${mostRecent.INSP_DATE}`);
      console.log(`   Inspection ID: ${mostRecent.INSPECTION_ID || 'N/A'}`);
      console.log(`   OOS Total: ${mostRecent.OOS_TOTAL || 0}\n`);
    } else {
      console.log(`ℹ️  No inspections found for DOT ${DOT_NUMBER}\n`);
    }
    
    console.log(`✅ API test complete! The endpoint is working correctly.\n`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.stack) {
      console.log(`Stack: ${error.stack}`);
    }
  }
}

testAPI();

