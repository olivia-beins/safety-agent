/**
 * Fillout API Types
 * Type definitions for Fillout form submissions and data structures
 */

export interface FilloutField {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  value?: string | number | boolean | string[] | null;
  [key: string]: unknown; // Allow for additional field properties
}

export interface FilloutSubmission {
  submissionId?: string;
  formId?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  fields?: FilloutField[];
  [key: string]: unknown; // Allow for additional submission properties
}

export interface FilloutContactInfo {
  safetyContactName?: string;
  safetyContactEmail?: string;
  safetyContactPhone?: string;
}

export interface FilloutCompanyInfo {
  companyName?: string;
  dotNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface FilloutOperationalData {
  eldSystem?: string;
  dashCameras?: string;
  cameraSystem?: string;
  cameraType?: string;
  trainingProvider?: string;
  trainingFrequency?: string;
  maintenanceShop?: string;
  maintenanceProgram?: string;
  driverCount?: number;
  ownerOperatorCount?: number;
  trailerTypes?: string;
  cargoTypes?: string;
  hazmat?: boolean;
  hazmatTypes?: string;
  regions?: string;
  [key: string]: unknown; // Allow for additional operational fields
}

export interface ProcessedFilloutData {
  submission: FilloutSubmission;
  contactInfo: FilloutContactInfo;
  companyInfo: FilloutCompanyInfo;
  operationalData: FilloutOperationalData;
  rawFields: Record<string, unknown>; // All fields in a flat structure for easy lookup
}

