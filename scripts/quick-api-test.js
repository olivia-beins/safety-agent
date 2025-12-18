// Quick test - just check if we get a response
const DOT = '1788847';
const url = `https://data.transportation.gov/api/views/fx4q-ay7w/rows.json?$where=DOT_NUMBER='${DOT}'&$limit=1`;

console.log('Testing API...');
fetch(url)
  .then(r => {
    console.log(`Status: ${r.status}`);
    return r.text();
  })
  .then(text => {
    const json = JSON.parse(text);
    console.log('Response keys:', Object.keys(json));
    if (json.data) {
      console.log('Data array length:', json.data.length);
      if (json.data.length > 0) {
        console.log('First record DOT:', json.data[0].DOT_NUMBER);
        console.log('First record OOS:', json.data[0].OOS_TOTAL);
      }
    }
  })
  .catch(e => console.error('Error:', e.message));

