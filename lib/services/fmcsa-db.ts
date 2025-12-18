/**
 * FMCSA Local Database Service
 * Queries the local SQLite database for FMCSA carrier and violation data
 * Can also fetch violations from Transportation.gov API
 */

import Database from 'better-sqlite3';
import type { FMCSARecord, Violation } from '../types/fmcsa';
import { getViolationsByDOTFromAPI } from './fmcsa-api';
import path from 'path';
import fs from 'fs';
import { mockScenarios } from '../data/mock-fmcsa-data';

const DB_PATH = path.join(process.cwd(), 'data', 'fmcsa.db');

let dbInstance: Database.Database | null = null;

function getDB(): Database.Database | null {
  if (dbInstance) {
    return dbInstance;
  }

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.log(`[FMCSA] Database not found at ${DB_PATH}, will use API or mock data`);
    return null;
  }

  try {
    dbInstance = new Database(DB_PATH, { readonly: true });
    return dbInstance;
  } catch (error) {
    console.error('[FMCSA] Error opening database:', error);
    return null;
  }
}

/**
 * Fetches FMCSA data by DOT number
 * Currently returns mock data for testing purposes
 */
export async function getFMCSADataByDOT(dotNumber: string): Promise<{ data: FMCSARecord | null; source: 'api' | 'database' | 'mock' }> {
  const cleanDotNumber = dotNumber.replace(/\D/g, '');
  
  if (!cleanDotNumber) {
    return { data: null, source: 'database' };
  }

  // TEMPORARY: For testing API, skip mock data if API is enabled
  const useAPIOnly = process.env.USE_API_ONLY === 'true' || process.env.ENABLE_FMCSA_API === 'true';
  const useMockData = process.env.USE_MOCK_FMCSA_DATA !== 'false' && !useAPIOnly;
  
  if (useMockData) {
    console.log(`[FMCSA] Using mock data for DOT ${cleanDotNumber}`);
    
    // Try to find a mock scenario that matches the DOT number
    const matchingScenario = mockScenarios.find(
      scenario => scenario.data.dotNumber === cleanDotNumber
    );
    
    if (matchingScenario) {
      console.log(`[FMCSA] Found matching mock scenario: ${matchingScenario.name}`);
      return { data: matchingScenario.data, source: 'mock' };
    }
    
    // If no exact match, use the first scenario but update the DOT number
    // This allows testing with any DOT number
    const defaultScenario = mockScenarios[0];
    if (defaultScenario) {
      console.log(`[FMCSA] Using default mock scenario: ${defaultScenario.name} (with DOT ${cleanDotNumber})`);
      return {
        data: {
          ...defaultScenario.data,
          dotNumber: cleanDotNumber,
        },
        source: 'mock' as const,
      };
    }
    
    // Fallback: return a basic mock record
    console.log(`[FMCSA] Using fallback mock data for DOT ${cleanDotNumber}`);
    return {
      data: {
      dotNumber: cleanDotNumber,
      legalName: 'Test Carrier LLC',
      dbaName: 'Test Carrier',
      physicalAddress: '123 Test St, Test City, ST 12345',
      phone: '555-0000',
      email: 'test@testcarrier.com',
      mcs150FormDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mcs150Mileage: 50000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 10,
      vehicleTotal: 8,
      violations: [],
      },
      source: 'mock' as const,
    };
  }

  // Use real database/API
  const db = getDB();
  
  let violations: any[] = [];
  
  let dataSource: 'api' | 'database' = 'database';
  
  // If API is enabled, try fetching from API first (for testing)
  if (useAPIOnly) {
    try {
      console.log(`[FMCSA] Fetching violations from API for DOT ${cleanDotNumber}...`);
      const apiViolations = await getViolationsByDOTFromAPI(cleanDotNumber);
      if (apiViolations.length > 0) {
        console.log(`[FMCSA] Found ${apiViolations.length} violations from API`);
        dataSource = 'api';
        violations = apiViolations.map((v, index) => ({
          id: v.id || index + 1,
          dot_number: parseInt(cleanDotNumber, 10),
          violation_date: v.violationDate,
          violation_type: v.violationType,
          violation_description: v.violationDescription,
          severity: v.severity,
          basic: v.basic,
          oos_indicator: v.oosIndicator,
          total_violations: v.totalViolations || 1,
        }));
      }
    } catch (error) {
      console.error('[FMCSA] Error fetching violations from API:', error);
    }
  }
  
  // If no API violations found (or API disabled), check local database
  if (violations.length === 0 && db) {
    try {
      const violationsStmt = db.prepare(`
        SELECT
          id,
          dot_number,
          violation_date,
          violation_type,
          violation_description,
          severity,
          basic,
          oos_indicator,
          total_violations
        FROM violations
        WHERE dot_number = ?
        ORDER BY violation_date DESC
      `);
      violations = violationsStmt.all(parseInt(cleanDotNumber, 10)) as any[];
    } catch (error) {
      console.error('[FMCSA] Error querying local database:', error);
    }
  }
  
  // If still no violations and API is enabled, try API as fallback
  if (violations.length === 0 && process.env.ENABLE_FMCSA_API === 'true' && !useAPIOnly) {
    try {
      const apiViolations = await getViolationsByDOTFromAPI(cleanDotNumber);
      if (apiViolations.length > 0) {
        dataSource = 'api';
        violations = apiViolations.map((v, index) => ({
          id: v.id || index + 1,
          dot_number: parseInt(cleanDotNumber, 10),
          violation_date: v.violationDate,
          violation_type: v.violationType,
          violation_description: v.violationDescription,
          severity: v.severity,
          basic: v.basic,
          oos_indicator: v.oosIndicator,
          total_violations: v.totalViolations || 1,
        }));
      }
    } catch (error) {
      console.error('[FMCSA] Error fetching violations from API (fallback):', error);
    }
  }

  // Query carrier info from local database
  let carrierRow: any = null;
  if (db) {
    try {
      const carrierStmt = db.prepare(`
        SELECT 
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
        FROM carrier_info
        WHERE dot_number = ?
        LIMIT 1
      `);
      carrierRow = carrierStmt.get(parseInt(cleanDotNumber, 10)) as any;
    } catch (error) {
      console.error('[FMCSA] Error querying carrier info:', error);
    }
  }

  // If no carrier info but we have violations, return minimal record
  if (!carrierRow) {
    if (violations.length > 0) {
      return {
        data: {
          dotNumber: cleanDotNumber,
          violations: violations.map((v): Violation => ({
          id: v.id,
          dotNumber: v.dot_number?.toString() || cleanDotNumber,
          violationDate: v.violation_date,
          violationType: v.violation_type,
          violationDescription: v.violation_description,
          severity: v.severity as any,
          basic: v.basic,
          oosIndicator: v.oos_indicator,
          totalViolations: v.total_violations,
        })),
        },
        source: dataSource,
      };
    }
    return { data: null, source: dataSource };
  }

  // Build physical address
  const addressParts = [
    carrierRow.physical_street,
    carrierRow.physical_city,
    carrierRow.physical_state,
    carrierRow.physical_zip,
  ].filter(Boolean);

  return {
    data: {
      dotNumber: carrierRow.dot_number?.toString() || cleanDotNumber,
      legalName: carrierRow.legal_name,
      physicalAddress: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      phone: carrierRow.phone,
      email: carrierRow.email_address,
      mcs150FormDate: carrierRow.mcs150_date,
      mcs150Mileage: carrierRow.mcs150_mileage,
      carrierOperation: carrierRow.carrier_operation,
      driverTotal: carrierRow.total_drivers,
      vehicleTotal: carrierRow.power_units,
      violations: violations.map((v): Violation => ({
      id: v.id,
      dotNumber: v.dot_number?.toString() || cleanDotNumber,
      violationDate: v.violation_date,
      violationType: v.violation_type,
      violationDescription: v.violation_description,
      severity: v.severity as any,
      basic: v.basic,
      oosIndicator: v.oos_indicator,
      totalViolations: v.total_violations,
    })),
    },
    source: dataSource,
  };
}

