/**
 * FMCSA Transportation.gov API Service
 * Fetches real violation data from data.transportation.gov
 */

import type { Violation } from '../types/fmcsa';

// Use SODA API resource endpoint (fastest, no auth required for public datasets)
// This returns clean JSON without metadata, much faster than rows.json
const FMCSA_INSPECTION_RESOURCE = 'https://data.transportation.gov/resource/fx4q-ay7w.json'; // Inspection summaries
const FMCSA_VIOLATION_RESOURCE = 'https://data.transportation.gov/resource/8mt8-2mdr.json'; // Detailed violations

interface SocrataResponse {
  data: Array<Record<string, unknown>>;
  meta?: {
    view?: {
      columns?: Array<{ name: string; dataTypeName: string }>;
    };
  };
}

/**
 * Fetches detailed violations for a specific DOT number from the Transportation.gov API
 * Uses the SMS Input - Violation dataset which contains detailed violation descriptions
 */
export async function getViolationsByDOTFromAPI(
  dotNumber: string
): Promise<Violation[]> {
  const cleanDotNumber = dotNumber.replace(/\D/g, '');
  if (!cleanDotNumber) {
    return [];
  }

  // Use SODA API resource endpoint - no authentication needed for public datasets
  // This endpoint returns clean JSON without metadata, much faster
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Optional: Add app token if available (for higher rate limits)
  const appToken = process.env.SOCRATA_APP_TOKEN;
  if (appToken) {
    headers['X-App-Token'] = appToken;
  }

  try {
    // Query the violations dataset for detailed violation information
    // Select columns: DOT_Number, Insp_Date, Viol_Code, BASIC_Desc, Section_Desc, OOS_Indicator, Severity_Weight
    const selectColumns = 'DOT_Number,Insp_Date,Viol_Code,BASIC_Desc,Section_Desc,OOS_Indicator,Severity_Weight,Group_Desc';
    const query = `$select=${selectColumns}&$where=DOT_Number='${cleanDotNumber}'&$order=Insp_Date DESC&$limit=200`;
    const url = `${FMCSA_VIOLATION_RESOURCE}?${query}`;

    console.log(`[FMCSA API] Fetching violations for DOT ${cleanDotNumber}...`);

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log(`[FMCSA API] Request timeout after 8 seconds`);
    }, 8000); // 8 second timeout

    // Try rows.json endpoint (Socrata standard)
    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log(`[FMCSA API] Request aborted due to timeout`);
        return [];
      }
      // If that fails, try without authentication
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 8000);
      try {
        response = await fetch(url, { signal: retryController.signal });
        clearTimeout(retryTimeout);
      } catch (retryError) {
        clearTimeout(retryTimeout);
        if (retryError instanceof Error && retryError.name === 'AbortError') {
          console.log(`[FMCSA API] Retry also timed out`);
          return [];
        }
        throw retryError;
      }
    }

    if (!response.ok) {
      console.log(`[FMCSA API] Response not OK: ${response.status}`);
      return [];
    }

    console.log(`[FMCSA API] Response received, parsing JSON...`);
    const startParse = Date.now();
    
    // Parse with timeout protection
    const data = await Promise.race([
      response.json(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('JSON parsing timeout')), 5000)
      )
    ]) as any;
    
    const parseTime = Date.now() - startParse;
    console.log(`[FMCSA API] JSON parsed in ${parseTime}ms`);
     
     // SODA API resource endpoint returns a direct array (no metadata wrapper)
     let violations: Array<Record<string, unknown>> = [];
     
     if (Array.isArray(data)) {
       // Direct array response (SODA API format)
       violations = data;
     } else if (data.data && Array.isArray(data.data)) {
       // Fallback: wrapped format
       violations = data.data;
     } else {
       // Log the structure for debugging
       console.log('[FMCSA API] Unexpected response structure:', Object.keys(data));
       return []; // Return empty if we can't find the data
     }

    console.log(`[FMCSA API] Found ${violations.length} violation record(s)`);

    if (violations.length > 0) {
      // Map violation records to Violation format
      // Each record is already a specific violation with detailed description
      return violations.map((viol, index): Violation => {
        const dotNum = String(viol.DOT_Number || viol.dot_number || cleanDotNumber);
        
        // Parse date - API returns format like "28-NOV-23" or "08-DEC-23"
        let violDate: string | undefined;
        if (viol.Insp_Date || viol.insp_date) {
          const dateStr = String(viol.Insp_Date || viol.insp_date);
          // Try to parse DD-MMM-YY format
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              violDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
            }
          } catch {
            // If parsing fails, try to extract date parts manually
            const dateMatch = dateStr.match(/(\d{2})-([A-Z]{3})-(\d{2})/);
            if (dateMatch) {
              const [, day, month, year] = dateMatch;
              const monthMap: Record<string, string> = {
                'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
                'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
                'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
              };
              const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
              violDate = `${fullYear}-${monthMap[month] || '01'}-${day}`;
            }
          }
        }
        
        // Handle both uppercase and lowercase field names from API
        const violCode = String(viol.Viol_Code || viol.viol_code || '');
        const sectionDesc = String(viol.Section_Desc || viol.section_desc || '');
        const basicDesc = String(viol.BASIC_Desc || viol.basic_desc || 'Other');
        const groupDesc = String(viol.Group_Desc || viol.group_desc || '');
        const oosIndicator = viol.OOS_Indicator || viol.oos_indicator;
        const severityWeight = viol.Severity_Weight || viol.severity_weight;
        
        // Determine severity based on severity weight and OOS status
        let severity: 'high' | 'medium' | 'low' | 'critical' = 'medium';
        const weight = severityWeight ? parseInt(String(severityWeight), 10) : 0;
        if (oosIndicator === 'true' || oosIndicator === 'Y' || String(oosIndicator).toLowerCase() === 'true') {
          severity = weight >= 8 ? 'critical' : 'high';
        } else if (weight >= 8) {
          severity = 'high';
        } else if (weight >= 5) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        // Build violation description from available fields
        let violationDescription = sectionDesc || groupDesc || violCode || 'Violation found';
        if (violCode && !violationDescription.includes(violCode)) {
          violationDescription = `${violationDescription} (Code: ${violCode})`;
        }
        
        return {
          id: index + 1,
          dotNumber: dotNum,
          violationDate: violDate,
          violationType: violCode || 'Violation',
          violationDescription: violationDescription,
          severity: severity,
          basic: basicDesc,
          oosIndicator: (oosIndicator === 'true' || oosIndicator === 'Y' || String(oosIndicator).toLowerCase() === 'true') ? 'Y' : 'N',
          totalViolations: 1, // Each record is one violation
        };
      });
    }

    // If no data found, return empty array
    return [];
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('timeout'))) {
      console.log(`[FMCSA API] Request timed out or was aborted`);
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[FMCSA API] Error fetching violations:', errorMessage);
    }
    return [];
  }
}

/**
 * Gets metadata about the dataset to understand column structure
 */
export async function getDatasetMetadata(): Promise<{
  columns: Array<{ name: string; dataTypeName: string }>;
} | null> {
  const appToken = process.env.SOCRATA_APP_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (appToken) {
    headers['X-App-Token'] = appToken;
  }

  try {
    const response = await fetch(`https://data.transportation.gov/api/views/fx4q-ay7w.json`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.meta?.view?.columns) {
        return {
          columns: data.meta.view.columns,
        };
      }
    }
  } catch (error) {
    console.error('Error fetching dataset metadata:', error);
  }

  return null;
}

