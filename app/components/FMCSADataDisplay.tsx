'use client';

import type { FMCSARecord } from '@/lib/types/fmcsa';

interface FMCSADataDisplayProps {
  data: FMCSARecord | null;
}

export function FMCSADataDisplay({ data }: FMCSADataDisplayProps) {
  if (!data) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <p className="text-sm text-yellow-800">
          No FMCSA data found for this submission.
        </p>
      </div>
    );
  }

  return (
    <details className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-gray-900 hover:text-gray-700">
        FMCSA Carrier Data
      </summary>
      <div className="border-t border-gray-200 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.dotNumber && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              DOT Number:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.dotNumber}</p>
          </div>
        )}
        {data.legalName && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              Legal Name:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.legalName}</p>
          </div>
        )}
        {data.dbaName && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              DBA Name:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.dbaName}</p>
          </div>
        )}
        {data.physicalAddress && (
          <div className="md:col-span-2">
            <span className="text-sm font-medium text-gray-500">
              Physical Address:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.physicalAddress}</p>
          </div>
        )}
        {data.phone && (
          <div>
            <span className="text-sm font-medium text-gray-500">Phone:</span>
            <p className="mt-1 text-sm text-gray-900">{data.phone}</p>
          </div>
        )}
        {data.email && (
          <div>
            <span className="text-sm font-medium text-gray-500">Email:</span>
            <p className="mt-1 text-sm text-gray-900">{data.email}</p>
          </div>
        )}
        {data.carrierOperation && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              Carrier Operation:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.carrierOperation}</p>
          </div>
        )}
        {data.cargoCarried && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              Cargo Carried:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.cargoCarried}</p>
          </div>
        )}
        {data.driverTotal !== undefined && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              Total Drivers:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.driverTotal}</p>
          </div>
        )}
        {data.vehicleTotal !== undefined && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              Total Vehicles:
            </span>
            <p className="mt-1 text-sm text-gray-900">{data.vehicleTotal}</p>
          </div>
        )}
        {data.mcs150FormDate && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              MCS-150 Form Date:
            </span>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(data.mcs150FormDate).toLocaleDateString()}
            </p>
          </div>
        )}
        {data.mcs150Mileage !== undefined && (
          <div>
            <span className="text-sm font-medium text-gray-500">
              MCS-150 Mileage:
            </span>
            <p className="mt-1 text-sm text-gray-900">
              {data.mcs150Mileage.toLocaleString()}
            </p>
          </div>
        )}
        </div>
      </div>
    </details>
  );
}

