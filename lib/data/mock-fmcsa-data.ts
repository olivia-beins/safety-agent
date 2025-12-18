import type { FMCSARecord } from '../types/fmcsa';

export interface MockScenario {
  name: string;
  description: string;
  data: FMCSARecord;
}

export const mockScenarios: MockScenario[] = [
  {
    name: 'Clean Record',
    description: 'A carrier with no violations and recent MCS-150 form',
    data: {
      dotNumber: '123456',
      legalName: 'Clean Transport LLC',
      dbaName: 'Clean Transport',
      physicalAddress: '123 Main St, Anytown, ST 12345',
      phone: '555-0100',
      email: 'info@cleantransport.com',
      mcs150FormDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
      mcs150Mileage: 50000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 10,
      vehicleTotal: 8,
      violations: [],
    },
  },
  {
    name: 'High Severity Violations',
    description: 'A carrier with recent high-severity violations',
    data: {
      dotNumber: '234567',
      legalName: 'Problem Carrier Inc',
      dbaName: 'Problem Carrier',
      physicalAddress: '456 Oak Ave, Somewhere, ST 67890',
      phone: '555-0200',
      email: 'contact@problemcarrier.com',
      mcs150FormDate: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 months ago
      mcs150Mileage: 150000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 25,
      vehicleTotal: 20,
      violations: [
        {
          dotNumber: '234567',
          violationDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months ago
          violationType: 'Hours of Service',
          violationDescription: 'Driver exceeded maximum driving time',
          severity: 'high',
          basic: 'HOS',
          oosIndicator: 'Y',
          totalViolations: 3,
        },
        {
          dotNumber: '234567',
          violationDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months ago
          violationType: 'Vehicle Maintenance',
          violationDescription: 'Brake system defects',
          severity: 'critical',
          basic: 'Vehicle Maintenance',
          oosIndicator: 'Y',
          totalViolations: 2,
        },
      ],
    },
  },
  {
    name: 'Old MCS-150 Form',
    description: 'A carrier with an outdated MCS-150 form (over 2 years old)',
    data: {
      dotNumber: '345678',
      legalName: 'Outdated Records Co',
      dbaName: 'Outdated Records',
      physicalAddress: '789 Pine Rd, Nowhere, ST 11111',
      phone: '555-0300',
      email: 'info@outdated.com',
      mcs150FormDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 years ago
      mcs150Mileage: 75000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 5,
      vehicleTotal: 4,
      violations: [],
    },
  },
  {
    name: 'Hazmat Carrier',
    description: 'A carrier transporting hazardous materials',
    data: {
      dotNumber: '456789',
      legalName: 'Hazmat Haulers Inc',
      dbaName: 'Hazmat Haulers',
      physicalAddress: '321 Safety Way, Secure, ST 22222',
      phone: '555-0400',
      email: 'safety@hazmathaulers.com',
      mcs150FormDate: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 months ago
      mcs150Mileage: 200000,
      carrierOperation: 'Interstate',
      cargoCarried: 'Hazardous Materials',
      driverTotal: 15,
      vehicleTotal: 12,
      violations: [
        {
          dotNumber: '456789',
          violationDate: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 months ago
          violationType: 'Hazmat Compliance',
          violationDescription: 'Improper hazmat labeling',
          severity: 'high',
          basic: 'Hazmat',
          oosIndicator: 'N',
          totalViolations: 1,
        },
      ],
    },
  },
  {
    name: 'Missing Driver/Vehicle Info',
    description: 'A carrier with missing driver and vehicle information',
    data: {
      dotNumber: '567890',
      legalName: 'Incomplete Data LLC',
      dbaName: 'Incomplete Data',
      physicalAddress: '654 Data St, Missing, ST 33333',
      phone: '555-0500',
      email: 'info@incomplete.com',
      mcs150FormDate: new Date(Date.now() - 10 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 months ago
      mcs150Mileage: 30000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 0,
      vehicleTotal: 0,
      violations: [],
    },
  },
  {
    name: 'Multiple Violation Types',
    description: 'A carrier with various types of violations (HOS, Vehicle Maintenance, Driver Fitness)',
    data: {
      dotNumber: '678901',
      legalName: 'Multiple Issues Transport',
      dbaName: 'Multiple Issues',
      physicalAddress: '987 Problem Blvd, Issues, ST 44444',
      phone: '555-0600',
      email: 'help@multipleissues.com',
      mcs150FormDate: new Date(Date.now() - 15 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 months ago
      mcs150Mileage: 180000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 30,
      vehicleTotal: 25,
      violations: [
        {
          dotNumber: '678901',
          violationDate: new Date(Date.now() - 1 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month ago
          violationType: 'Hours of Service',
          violationDescription: 'Exceeded 11-hour driving limit',
          severity: 'high',
          basic: 'Hours-of-Service Compliance',
          oosIndicator: 'N',
          totalViolations: 5,
        },
        {
          dotNumber: '678901',
          violationDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months ago
          violationType: 'Vehicle Maintenance',
          violationDescription: 'Tire tread depth below minimum',
          severity: 'medium',
          basic: 'Vehicle Maintenance',
          oosIndicator: 'Y',
          totalViolations: 3,
        },
        {
          dotNumber: '678901',
          violationDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 months ago
          violationType: 'Driver Fitness',
          violationDescription: 'Expired medical certificate',
          severity: 'high',
          basic: 'Driver Fitness',
          oosIndicator: 'Y',
          totalViolations: 2,
        },
        {
          dotNumber: '678901',
          violationDate: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 months ago
          violationType: 'Controlled Substances',
          violationDescription: 'Missing drug test',
          severity: 'high',
          basic: 'Controlled Substances',
          oosIndicator: 'N',
          totalViolations: 1,
        },
      ],
    },
  },
  {
    name: 'Passenger Carrier',
    description: 'A passenger carrier requiring enhanced safety protocols',
    data: {
      dotNumber: '789012',
      legalName: 'Passenger Transport Services',
      dbaName: 'Passenger Transport',
      physicalAddress: '147 Bus Lane, Transit, ST 55555',
      phone: '555-0700',
      email: 'info@passengertransport.com',
      mcs150FormDate: new Date(Date.now() - 7 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 months ago
      mcs150Mileage: 120000,
      carrierOperation: 'Interstate',
      cargoCarried: 'Passengers',
      driverTotal: 20,
      vehicleTotal: 15,
      violations: [],
    },
  },
  {
    name: 'High Mileage Operations',
    description: 'A carrier with very high annual mileage',
    data: {
      dotNumber: '890123',
      legalName: 'High Mileage Logistics',
      dbaName: 'High Mileage',
      physicalAddress: '258 Highway Dr, Miles, ST 66666',
      phone: '555-0800',
      email: 'dispatch@highmileage.com',
      mcs150FormDate: new Date(Date.now() - 9 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 months ago
      mcs150Mileage: 250000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 50,
      vehicleTotal: 40,
      violations: [
        {
          dotNumber: '890123',
          violationDate: new Date(Date.now() - 5 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 months ago
          violationType: 'Vehicle Maintenance',
          violationDescription: 'Routine maintenance overdue',
          severity: 'medium',
          basic: 'Vehicle Maintenance',
          oosIndicator: 'N',
          totalViolations: 1,
        },
      ],
    },
  },
  {
    name: 'Small Fleet',
    description: 'A small fleet (less than 5 drivers)',
    data: {
      dotNumber: '901234',
      legalName: 'Small Fleet Operations',
      dbaName: 'Small Fleet',
      physicalAddress: '369 Local St, Small, ST 77777',
      phone: '555-0900',
      email: 'owner@smallfleet.com',
      mcs150FormDate: new Date(Date.now() - 11 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 11 months ago
      mcs150Mileage: 40000,
      carrierOperation: 'Interstate',
      cargoCarried: 'General Freight',
      driverTotal: 3,
      vehicleTotal: 2,
      violations: [],
    },
  },
];
