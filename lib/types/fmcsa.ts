// FMCSA Data Types (from Metabase)
export interface Violation {
  id?: number;
  dotNumber: string;
  violationDate?: string;
  violationType?: string;
  violationDescription?: string;
  severity?: string;
  basic?: string;
  oosIndicator?: string;
  totalViolations?: number;
}

export interface FMCSARecord {
  dotNumber?: string;
  legalName?: string;
  dbaName?: string;
  physicalAddress?: string;
  phone?: string;
  email?: string;
  mcs150FormDate?: string;
  mcs150Mileage?: number;
  carrierOperation?: string;
  cargoCarried?: string;
  driverTotal?: number;
  vehicleTotal?: number;
  violations?: Violation[];
  [key: string]: unknown; // Allow for additional fields
}

export interface FMCSAQueryResult {
  data: FMCSARecord[];
  columns: string[];
  rowCount: number;
}

