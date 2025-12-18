/**
 * End-to-end test of FMCSA API integration
 */

require('dotenv').config({ path: './.env.local' });

const DOT_NUMBER = process.argv[2] || '1788847';

async function testEndToEnd() {
  console.log(`\n🧪 Testing FMCSA API integration for DOT: ${DOT_NUMBER}\n`);
  
  // Test 1: Direct API call
  console.log('1️⃣  Testing direct API call...');
  try {
    const selectColumns = 'DOT_NUMBER,INSP_DATE,INSPECTION_ID,VEHICLE_OOS_TOTAL,DRIVER_OOS_TOTAL,HAZMAT_OOS_TOTAL,OOS_TOTAL';
    const query = `$select=${selectColumns}&$where=DOT_NUMBER='${DOT_NUMBER}'&$order=INSP_DATE DESC&$limit=5`;
    const url = `https://data.transportation.gov/resource/fx4q-ay7w.json?${query}`;
    
    const start = Date.now();
    const response = await fetch(url);
    const elapsed = Date.now() - start;
    
    if (!response.ok) {
      console.log(`   ❌ API call failed: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`   ✅ API responded in ${elapsed}ms`);
    console.log(`   📊 Found ${data.length} inspection record(s)`);
    
    if (data.length > 0) {
      const withOOS = data.filter(r => parseInt(r.OOS_TOTAL || '0', 10) > 0);
      console.log(`   ⚠️  ${withOOS.length} record(s) with OOS violations`);
      if (withOOS.length > 0) {
        console.log(`   📄 Sample OOS record:`);
        console.log(`      Date: ${withOOS[0].INSP_DATE}`);
        console.log(`      Vehicle OOS: ${withOOS[0].VEHICLE_OOS_TOTAL || 0}`);
        console.log(`      Driver OOS: ${withOOS[0].DRIVER_OOS_TOTAL || 0}`);
        console.log(`      Total OOS: ${withOOS[0].OOS_TOTAL || 0}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return;
  }
  
  // Test 2: Service function
  console.log(`\n2️⃣  Testing service function...`);
  try {
    // Import the service (need to use dynamic import for ES modules)
    const { getViolationsByDOTFromAPI } = await import('../lib/services/fmcsa-api.ts');
    
    const start = Date.now();
    const violations = await getViolationsByDOTFromAPI(DOT_NUMBER);
    const elapsed = Date.now() - start;
    
    console.log(`   ✅ Service function completed in ${elapsed}ms`);
    console.log(`   📊 Generated ${violations.length} violation record(s)`);
    
    if (violations.length > 0) {
      console.log(`   📄 Sample violations:`);
      violations.slice(0, 3).forEach((v, i) => {
        console.log(`      ${i + 1}. ${v.violationType} (${v.severity}) - ${v.violationDate}`);
        console.log(`         OOS: ${v.oosIndicator}, Basic: ${v.basic}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
  
  // Test 3: Database service integration
  console.log(`\n3️⃣  Testing database service integration...`);
  try {
    process.env.ENABLE_FMCSA_API = 'true'; // Enable API for this test
    
    const { getFMCSADataByDOT } = await import('../lib/services/fmcsa-db.ts');
    
    const start = Date.now();
    const fmcsaData = await getFMCSADataByDOT(DOT_NUMBER);
    const elapsed = Date.now() - start;
    
    console.log(`   ✅ Database service completed in ${elapsed}ms`);
    
    if (fmcsaData) {
      console.log(`   📊 Carrier: ${fmcsaData.legalName || 'N/A'}`);
      console.log(`   📊 Violations: ${fmcsaData.violations?.length || 0}`);
      if (fmcsaData.violations && fmcsaData.violations.length > 0) {
        const oosViolations = fmcsaData.violations.filter(v => v.oosIndicator === 'Y');
        console.log(`   ⚠️  OOS Violations: ${oosViolations.length}`);
      }
    } else {
      console.log(`   ℹ️  No FMCSA data found (this is OK if no local data exists)`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log(`\n✅ End-to-end test complete!\n`);
}

testEndToEnd();

