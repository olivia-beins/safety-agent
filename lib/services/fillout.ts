/**
 * Fillout API Service
 * Handles fetching and processing Fillout form submissions
 */

import type {
  FilloutSubmission,
  FilloutField,
  FilloutContactInfo,
  FilloutCompanyInfo,
  FilloutOperationalData,
  ProcessedFilloutData,
} from '../types/fillout';

const FILLOUT_API_BASE = 'https://api.fillout.com';

/**
 * Finds a field in a submission by trying multiple label patterns
 */
function findFieldByLabel(
  submission: FilloutSubmission,
  patterns: string[]
): FilloutField | null {
  if (!submission.fields || !Array.isArray(submission.fields)) {
    return null;
  }

  for (const field of submission.fields) {
    const label = (field.label || field.name || '').toLowerCase();
    const value = field.value;

    // Try each pattern first (don't skip empty values yet - we want to find the field even if empty)
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      if (
        label.includes(patternLower) ||
        (field.name && field.name.toLowerCase().includes(patternLower)) ||
        (field.id && field.id.toLowerCase().includes(patternLower))
      ) {
        // Found the field - return it even if value is empty (caller can check)
        return field;
      }
    }
  }

  return null;
}

/**
 * Extracts DOT number from submission
 */
export function extractDOTNumber(submission: FilloutSubmission): string | null {
  const patterns = [
    '🚛 dot number',
    'dot number',
    'dot_number',
    'dotnumber',
    'dot',
    'dot#',
    'dot #',
  ];

  const field = findFieldByLabel(submission, patterns);
  if (!field) {
    return null;
  }
  
  // Check if field has a value
  if (field.value === null || field.value === undefined || field.value === '') {
    return null;
  }

  // Extract numeric value, removing any formatting
  const dotValue = String(field.value).replace(/\D/g, '');
  return dotValue || null;
}

/**
 * Extracts contact information from submission
 */
export function extractContactInfo(
  submission: FilloutSubmission
): FilloutContactInfo {
  const safetyNamePatterns = [
    '👤 safety contact name',
    'safety contact name',
    'safety contact',
    'contact name',
  ];
  const safetyEmailPatterns = [
    '✉️ safety contact email',
    'safety contact email',
    'safety email',
    'contact email',
  ];
  const safetyPhonePatterns = [
    'safety contact phone',
    'safety phone',
    'contact phone',
    'phone',
  ];

  const nameField = findFieldByLabel(submission, safetyNamePatterns);
  const emailField = findFieldByLabel(submission, safetyEmailPatterns);
  const phoneField = findFieldByLabel(submission, safetyPhonePatterns);

  return {
    safetyContactName: nameField?.value ? String(nameField.value) : undefined,
    safetyContactEmail: emailField?.value
      ? String(emailField.value)
      : undefined,
    safetyContactPhone: phoneField?.value
      ? String(phoneField.value)
      : undefined,
  };
}

/**
 * Extracts company information from submission
 */
export function extractCompanyInfo(
  submission: FilloutSubmission
): FilloutCompanyInfo {
  const companyNamePatterns = [
    '🏢 company name',
    'company name',
    'company',
    'business name',
  ];
  const addressPatterns = [
    'address',
    'company address',
    'primary terminal address',
    'street',
  ];
  const cityPatterns = ['city', 'company city'];
  const statePatterns = ['state', 'province', 'state/province'];
  const zipPatterns = ['zip', 'postal code', 'zip/postal'];
  const countryPatterns = ['country'];

  const companyField = findFieldByLabel(submission, companyNamePatterns);
  const addressField = findFieldByLabel(submission, addressPatterns);
  const cityField = findFieldByLabel(submission, cityPatterns);
  const stateField = findFieldByLabel(submission, statePatterns);
  const zipField = findFieldByLabel(submission, zipPatterns);
  const countryField = findFieldByLabel(submission, countryPatterns);

  return {
    companyName: companyField?.value ? String(companyField.value) : undefined,
    dotNumber: extractDOTNumber(submission) || undefined,
    address: addressField?.value ? String(addressField.value) : undefined,
    city: cityField?.value ? String(cityField.value) : undefined,
    state: stateField?.value ? String(stateField.value) : undefined,
    zipCode: zipField?.value ? String(zipField.value) : undefined,
    country: countryField?.value ? String(countryField.value) : undefined,
  };
}

/**
 * Extracts operational data from submission
 */
export function extractOperationalData(
  submission: FilloutSubmission
): FilloutOperationalData {
  const eldPatterns = ['eld system', 'eld', 'electronic logging device'];
  const dashCamPatterns = ['dash cameras', 'dash camera', 'cameras'];
  const cameraSystemPatterns = ['camera system', 'camera'];
  const trainingProviderPatterns = [
    'training provider',
    'external training provider',
    'training',
  ];
  const trainingFreqPatterns = [
    'training frequency',
    'how often',
    'training meetings',
  ];
  const maintenanceShopPatterns = ['maintenance shop', 'own shop'];
  const maintenanceProgramPatterns = [
    'preventive maintenance',
    'pm program',
    'maintenance program',
  ];
  const driverCountPatterns = ['company drivers', 'w2 drivers', 'drivers'];
  const ownerOpPatterns = [
    'owner operators',
    '1099',
    'owner-operator',
    'contractors',
  ];

  const eldField = findFieldByLabel(submission, eldPatterns);
  const dashCamField = findFieldByLabel(submission, dashCamPatterns);
  const cameraSystemField = findFieldByLabel(submission, cameraSystemPatterns);
  const trainingProviderField = findFieldByLabel(
    submission,
    trainingProviderPatterns
  );
  const trainingFreqField = findFieldByLabel(
    submission,
    trainingFreqPatterns
  );
  const maintenanceShopField = findFieldByLabel(
    submission,
    maintenanceShopPatterns
  );
  const maintenanceProgramField = findFieldByLabel(
    submission,
    maintenanceProgramPatterns
  );
  const driverCountField = findFieldByLabel(submission, driverCountPatterns);
  const ownerOpField = findFieldByLabel(submission, ownerOpPatterns);

  return {
    eldSystem: eldField?.value ? String(eldField.value) : undefined,
    dashCameras: dashCamField?.value ? String(dashCamField.value) : undefined,
    cameraSystem: cameraSystemField?.value
      ? String(cameraSystemField.value)
      : undefined,
    trainingProvider: trainingProviderField?.value
      ? String(trainingProviderField.value)
      : undefined,
    trainingFrequency: trainingFreqField?.value
      ? String(trainingFreqField.value)
      : undefined,
    maintenanceShop: maintenanceShopField?.value
      ? String(maintenanceShopField.value)
      : undefined,
    maintenanceProgram: maintenanceProgramField?.value
      ? String(maintenanceProgramField.value)
      : undefined,
    driverCount: driverCountField?.value
      ? parseInt(String(driverCountField.value), 10)
      : undefined,
    ownerOperatorCount: ownerOpField?.value
      ? parseInt(String(ownerOpField.value), 10)
      : undefined,
  };
}

/**
 * Processes a Fillout submission and extracts all relevant data
 */
export function processFilloutSubmission(
  submission: FilloutSubmission
): ProcessedFilloutData {
  // Create a flat structure of all fields for easy lookup
  const rawFields: Record<string, unknown> = {};
  if (submission.fields && Array.isArray(submission.fields)) {
    for (const field of submission.fields) {
      const key = field.name || field.id || field.label || 'unknown';
      rawFields[key] = field.value;
      // Also index by label for easier lookup
      if (field.label) {
        rawFields[field.label] = field.value;
      }
    }
  }

  return {
    submission,
    contactInfo: extractContactInfo(submission),
    companyInfo: extractCompanyInfo(submission),
    operationalData: extractOperationalData(submission),
    rawFields,
  };
}

/**
 * Fetches all forms from Fillout API
 */
export async function getAllForms(): Promise<Array<{ formId: string; name: string }>> {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured');
  }

  // Try /v1/api/forms first
  let response = await fetch(`${FILLOUT_API_BASE}/v1/api/forms?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  // If that fails, try without /api
  if (!response.ok && response.status === 404) {
    response = await fetch(`${FILLOUT_API_BASE}/v1/forms?limit=100`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (response.ok) {
    const data = await response.json();
    const forms = data.forms || data.data || [];
    return forms.map((f: any) => ({
      formId: f.formId || f.id,
      name: f.name || 'Unknown',
    }));
  }

  return [];
}

/**
 * Fetches a submission from Fillout API by searching through forms
 * Note: Fillout API doesn't have a direct endpoint to get submission by ID alone
 */
export async function getSubmission(
  submissionId: string,
  formId?: string
): Promise<FilloutSubmission> {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured');
  }

  // If formId is provided, search that form first
  let formIdsToSearch: string[] = [];
  let searchedForms: string[] = [];
  
  if (formId) {
    formIdsToSearch = [formId];
  } else {
    // Fetch all forms and search through them
    // Default to the primary form: aUQeuCHHexus first, then all others
    const defaultFormId = 'aUQeuCHHexus';
    console.log(`Fetching all forms to search for submission ${submissionId}...`);
    
    try {
      const allForms = await getAllForms();
      const allFormIds = allForms.map(f => f.formId);
      
      // Put default form first, then others
      const otherForms = allFormIds.filter(id => id !== defaultFormId);
      formIdsToSearch = [defaultFormId, ...otherForms];
      
      console.log(`Will search through ${formIdsToSearch.length} forms (starting with ${defaultFormId})`);
    } catch (err) {
      console.log('Could not fetch all forms, using default form only');
      formIdsToSearch = [defaultFormId];
    }
  }

  for (const searchFormId of formIdsToSearch) {
    // Try /v1/api/forms/{formId}/submissions first
    // Note: Fillout API max limit is 150, and we may need to paginate
    let allSubmissions: any[] = [];
    let after: string | undefined = undefined;
    let hasMore = true;
    
    while (hasMore) {
      const params = new URLSearchParams();
      params.append('limit', '150');
      if (after) {
        params.append('after', after);
      }
      
      let response = await fetch(
        `${FILLOUT_API_BASE}/v1/api/forms/${searchFormId}/submissions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If that fails, try without /api
      if (!response.ok && response.status === 404) {
        response = await fetch(
          `${FILLOUT_API_BASE}/v1/forms/${searchFormId}/submissions?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (response.ok) {
        const data = await response.json();
        const submissions = data.responses || data.submissions || [];
        allSubmissions = allSubmissions.concat(submissions);
        
        // Check for pagination - Fillout uses cursor-based pagination
        // If we got 150 results, there might be more
        hasMore = submissions.length === 150;
        if (hasMore && submissions.length > 0) {
          // Use the last submission's ID as the cursor for next page
          after = submissions[submissions.length - 1].submissionId || submissions[submissions.length - 1].id;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    if (allSubmissions.length > 0) {
      searchedForms.push(searchFormId);
      console.log(`  Searched form ${searchFormId}: found ${allSubmissions.length} submissions`);
      
      // Find the submission with matching ID (try multiple ID formats)
      const foundSubmission = allSubmissions.find((s: any) => {
        const id1 = s.submissionId;
        const id2 = s.id;
        const id3 = String(s._id || '');
        const id4 = s.submission_id;
        return id1 === submissionId || 
               id2 === submissionId || 
               id3 === submissionId ||
               id4 === submissionId ||
               String(id1) === submissionId ||
               String(id2) === submissionId;
      });
      
      if (foundSubmission) {
        console.log(`  ✅ Found submission in form ${searchFormId}!`);
        // Transform to match FilloutSubmission format
        // Map questions to fields, handling both direct value and nested value structures
        const fields = foundSubmission.questions?.map((q: any) => {
          // Handle different value structures
          let fieldValue = q.value;
          if (fieldValue === null || fieldValue === undefined) {
            fieldValue = null;
          } else if (typeof fieldValue === 'object' && fieldValue !== null) {
            // For address fields, extract the address string
            if (fieldValue.address) {
              fieldValue = fieldValue.address;
            } else {
              // For other objects, try to stringify or get a meaningful value
              fieldValue = JSON.stringify(fieldValue);
            }
          }
          
          return {
            id: q.id,
            name: q.name,
            label: q.name,
            type: q.type,
            value: fieldValue,
          };
        }) || [];
        
        return {
          submissionId: foundSubmission.submissionId || foundSubmission.id || submissionId,
          formId: searchFormId,
          createdAt: foundSubmission.submissionTime || foundSubmission.createdAt || foundSubmission.startedAt,
          updatedAt: foundSubmission.lastUpdatedAt || foundSubmission.updatedAt,
          status: foundSubmission.status,
          fields: fields,
        };
      }
    }
  }

  // If we get here, submission wasn't found
  const formsSearched = searchedForms.length > 0 
    ? `forms: ${searchedForms.join(', ')}` 
    : `${formIdsToSearch.length} forms`;
  throw new Error(
    `Submission ${submissionId} not found after searching ${formsSearched}. Make sure the submission ID is correct and exists in one of your forms.`
  );
}

/**
 * Fetches submissions for a form from Fillout API
 */
export async function getSubmissions(
  formId: string,
  options?: { limit?: number; after?: string }
): Promise<{ responses: FilloutSubmission[]; totalResponses?: number }> {
  const apiKey = process.env.FILLOUT_API_KEY;
  if (!apiKey) {
    throw new Error('FILLOUT_API_KEY is not configured');
  }

  const params = new URLSearchParams();
  if (options?.limit) {
    params.append('limit', String(options.limit));
  }
  if (options?.after) {
    params.append('after', options.after);
  }

  // Try both endpoint variations
  let response = await fetch(
    `${FILLOUT_API_BASE}/v1/api/forms/${formId}/submissions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // If that fails, try without /api
  if (!response.ok && response.status === 404) {
    response = await fetch(
      `${FILLOUT_API_BASE}/v1/forms/${formId}/submissions?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(
      `Failed to fetch Fillout submissions: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

