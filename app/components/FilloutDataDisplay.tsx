'use client';

import type { ProcessedFilloutData } from '@/lib/types/fillout';

interface FilloutDataDisplayProps {
  data: ProcessedFilloutData;
}

export function FilloutDataDisplay({ data }: FilloutDataDisplayProps) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  const hasValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  return (
    <details className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-gray-900 hover:text-gray-700">
        Fillout Submission Data
      </summary>
      <div className="border-t border-gray-200 p-6 space-y-6">
        {/* Company Information */}
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
            Company Information
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {hasValue(data.companyInfo.companyName) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Company Name:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.companyName)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.dotNumber) && (
              <div>
                <span className="text-xs font-medium text-gray-500">DOT Number:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.dotNumber)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.address) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Address:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.address)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.city) && (
              <div>
                <span className="text-xs font-medium text-gray-500">City:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.city)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.state) && (
              <div>
                <span className="text-xs font-medium text-gray-500">State:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.state)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.zipCode) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Zip Code:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.zipCode)}</p>
              </div>
            )}
            {hasValue(data.companyInfo.country) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Country:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.companyInfo.country)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
            Contact Information
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {hasValue(data.contactInfo.safetyContactName) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Safety Contact Name:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.contactInfo.safetyContactName)}</p>
              </div>
            )}
            {hasValue(data.contactInfo.safetyContactEmail) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Safety Contact Email:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.contactInfo.safetyContactEmail)}</p>
              </div>
            )}
            {hasValue(data.contactInfo.safetyContactPhone) && (
              <div>
                <span className="text-xs font-medium text-gray-500">Safety Contact Phone:</span>
                <p className="mt-1 text-sm text-gray-900">{formatValue(data.contactInfo.safetyContactPhone)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Operational Data */}
        {(hasValue(data.operationalData.eldSystem) ||
          hasValue(data.operationalData.dashCameras) ||
          hasValue(data.operationalData.driverCount) ||
          hasValue(data.operationalData.ownerOperatorCount) ||
          hasValue(data.operationalData.trainingProvider) ||
          hasValue(data.operationalData.maintenanceProgram) ||
          hasValue(data.operationalData.trailerTypes) ||
          hasValue(data.operationalData.cargoTypes) ||
          hasValue(data.operationalData.hazmat) ||
          hasValue(data.operationalData.regions)) && (
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
              Operational Data
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {hasValue(data.operationalData.eldSystem) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">ELD System:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.eldSystem)}</p>
                </div>
              )}
              {hasValue(data.operationalData.dashCameras) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Dash Cameras:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.dashCameras)}</p>
                </div>
              )}
              {hasValue(data.operationalData.cameraSystem) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Camera System:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.cameraSystem)}</p>
                </div>
              )}
              {hasValue(data.operationalData.cameraType) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Camera Type:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.cameraType)}</p>
                </div>
              )}
              {hasValue(data.operationalData.driverCount) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Company Drivers (W2):</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.driverCount)}</p>
                </div>
              )}
              {hasValue(data.operationalData.ownerOperatorCount) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Owner-Operators (1099):</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.ownerOperatorCount)}</p>
                </div>
              )}
              {hasValue(data.operationalData.trainingProvider) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Training Provider:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.trainingProvider)}</p>
                </div>
              )}
              {hasValue(data.operationalData.trainingFrequency) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Training Frequency:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.trainingFrequency)}</p>
                </div>
              )}
              {hasValue(data.operationalData.maintenanceShop) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Maintenance Shop:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.maintenanceShop)}</p>
                </div>
              )}
              {hasValue(data.operationalData.maintenanceProgram) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Maintenance Program:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.maintenanceProgram)}</p>
                </div>
              )}
              {hasValue(data.operationalData.trailerTypes) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Trailer Types:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.trailerTypes)}</p>
                </div>
              )}
              {hasValue(data.operationalData.cargoTypes) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Cargo Types:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.cargoTypes)}</p>
                </div>
              )}
              {hasValue(data.operationalData.hazmat) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Hazmat:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.hazmat)}</p>
                </div>
              )}
              {hasValue(data.operationalData.hazmatTypes) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Hazmat Types:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.hazmatTypes)}</p>
                </div>
              )}
              {hasValue(data.operationalData.regions) && (
                <div>
                  <span className="text-xs font-medium text-gray-500">Regions/Routes:</span>
                  <p className="mt-1 text-sm text-gray-900">{formatValue(data.operationalData.regions)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Fields - Show all other fields that aren't in the structured data */}
        {data.submission.fields && data.submission.fields.length > 0 && (
          <details className="rounded-lg border border-gray-200 bg-gray-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900">
              All Form Fields ({data.submission.fields.length} fields)
            </summary>
            <div className="border-t border-gray-200 p-4 space-y-2 max-h-96 overflow-y-auto">
              {data.submission.fields.map((field, index) => {
                // Skip fields that are already displayed in structured sections
                const fieldLabel = field.label || field.name || field.id || `Field ${index + 1}`;
                const fieldValue = formatValue(field.value);
                
                // Skip if empty or already shown
                if (!hasValue(field.value)) return null;
                
                return (
                  <div key={field.id || index} className="flex gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-500 block truncate">{fieldLabel}:</span>
                      <p className="mt-1 text-sm text-gray-900 break-words">{fieldValue}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Submission Metadata */}
        {(data.submission.submissionId || data.submission.formId || data.submission.createdAt || data.submission.updatedAt) && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Submission Metadata
            </h4>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-xs text-gray-600">
              {data.submission.submissionId && (
                <div>
                  <span className="font-medium">Submission ID:</span> {data.submission.submissionId}
                </div>
              )}
              {data.submission.formId && (
                <div>
                  <span className="font-medium">Form ID:</span> {data.submission.formId}
                </div>
              )}
              {data.submission.createdAt && (
                <div>
                  <span className="font-medium">Created:</span> {new Date(data.submission.createdAt).toLocaleString()}
                </div>
              )}
              {data.submission.updatedAt && (
                <div>
                  <span className="font-medium">Updated:</span> {new Date(data.submission.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

