/**
 * Script to add test FMCSA data for DOT 1788847
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'fmcsa.db');

// Check if database exists
const fs = require('fs');
if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`);
  console.log('Creating database...');
  // Create directory if it doesn't exist
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const db = new Database(DB_PATH);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS carrier_info (
    dot_number INTEGER PRIMARY KEY,
    legal_name TEXT,
    physical_street TEXT,
    physical_city TEXT,
    physical_state TEXT,
    physical_zip TEXT,
    phone TEXT,
    email_address TEXT,
    mcs150_date TEXT,
    mcs150_mileage INTEGER,
    carrier_operation TEXT,
    total_drivers INTEGER,
    power_units INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dot_number INTEGER NOT NULL,
    violation_date TEXT,
    violation_type TEXT,
    violation_description TEXT,
    severity TEXT,
    basic TEXT,
    oos_indicator TEXT,
    total_violations INTEGER,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_violations_dot_number ON violations(dot_number);
  CREATE INDEX IF NOT EXISTS idx_violations_date ON violations(violation_date);
  CREATE INDEX IF NOT EXISTS idx_violations_basic ON violations(basic);
`);

// Insert carrier info for DOT 1788847
const dotNumber = 1788847;
const insertCarrier = db.prepare(`
  INSERT OR REPLACE INTO carrier_info (
    dot_number,
    legal_name,
    physical_street,
    physical_city,
    physical_state,
    physical_zip,
    phone,
    email_address,
    mcs150_date,
    mcs150_mileage,
    carrier_operation,
    total_drivers,
    power_units
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const carrierData = {
  dotNumber: dotNumber,
  legalName: 'Transport Solutions LLC',
  street: '456 Commerce Drive',
  city: 'Phoenix',
  state: 'AZ',
  zip: '85001',
  phone: '(602) 555-9876',
  email: 'safety@transportsolutions.com',
  mcs150Date: '2024-03-20', // Recent (within 2 years)
  mcs150Mileage: 1800000,
  carrierOperation: 'Interstate',
  totalDrivers: 28,
  powerUnits: 75,
};

insertCarrier.run(
  carrierData.dotNumber,
  carrierData.legalName,
  carrierData.street,
  carrierData.city,
  carrierData.state,
  carrierData.zip,
  carrierData.phone,
  carrierData.email,
  carrierData.mcs150Date,
  carrierData.mcs150Mileage,
  carrierData.carrierOperation,
  carrierData.totalDrivers,
  carrierData.powerUnits
);

console.log(`✅ Inserted carrier info for DOT ${dotNumber}: ${carrierData.legalName}`);

// Insert some violations
const insertViolation = db.prepare(`
  INSERT INTO violations (
    dot_number,
    violation_date,
    violation_type,
    violation_description,
    severity,
    basic,
    oos_indicator,
    total_violations
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const violations = [
  {
    date: '2024-11-10',
    type: '395.3A1',
    description: 'Driver failed to maintain daily log - missing entries',
    severity: 'high',
    basic: 'Hours-of-Service Compliance',
    oos: 'N',
    count: 1,
  },
  {
    date: '2024-10-28',
    type: '396.3A1',
    description: 'Brake system defect - brake adjustment out of specification',
    severity: 'high',
    basic: 'Vehicle Maintenance',
    oos: 'Y',
    count: 1,
  },
  {
    date: '2024-09-15',
    type: '393.45',
    description: 'Defective brake adjustment - multiple violations',
    severity: 'medium',
    basic: 'Vehicle Maintenance',
    oos: 'N',
    count: 2,
  },
  {
    date: '2024-08-22',
    type: '395.8A',
    description: 'Driving beyond 11-hour limit',
    severity: 'high',
    basic: 'Hours-of-Service Compliance',
    oos: 'N',
    count: 1,
  },
  {
    date: '2024-07-08',
    type: '392.2',
    description: 'Speeding violation - 12 mph over posted limit',
    severity: 'high',
    basic: 'Unsafe Driving',
    oos: 'N',
    count: 1,
  },
  {
    date: '2024-06-12',
    type: '391.11B2',
    description: 'Driver qualification file incomplete - missing medical certificate',
    severity: 'medium',
    basic: 'Driver Fitness',
    oos: 'N',
    count: 1,
  },
  {
    date: '2024-05-20',
    type: '396.3A1',
    description: 'Tire tread depth below minimum - multiple tires',
    severity: 'medium',
    basic: 'Vehicle Maintenance',
    oos: 'N',
    count: 1,
  },
  {
    date: '2024-04-05',
    type: '395.3A1',
    description: 'Driver log violation - false log entries',
    severity: 'high',
    basic: 'Hours-of-Service Compliance',
    oos: 'N',
    count: 1,
  },
];

let violationCount = 0;
for (const violation of violations) {
  insertViolation.run(
    dotNumber,
    violation.date,
    violation.type,
    violation.description,
    violation.severity,
    violation.basic,
    violation.oos,
    violation.count
  );
  violationCount++;
}

console.log(`✅ Inserted ${violationCount} violations for DOT ${dotNumber}`);

// Verify the data
const checkCarrier = db.prepare('SELECT * FROM carrier_info WHERE dot_number = ?').get(dotNumber);
const checkViolations = db.prepare('SELECT COUNT(*) as count FROM violations WHERE dot_number = ?').get(dotNumber);

console.log(`\n📊 Verification:`);
console.log(`   Carrier: ${checkCarrier ? checkCarrier.legal_name : 'NOT FOUND'}`);
console.log(`   Violations: ${checkViolations.count}`);

db.close();
console.log(`\n✅ Test data added successfully for DOT ${dotNumber}!`);
console.log(`   Company: ${carrierData.legalName}`);
console.log(`   Location: ${carrierData.city}, ${carrierData.state}\n`);

