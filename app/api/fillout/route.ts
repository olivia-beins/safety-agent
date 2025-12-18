import { NextRequest, NextResponse } from 'next/server';
import {
  getSubmission,
  processFilloutSubmission,
  extractDOTNumber,
} from '@/lib/services/fillout';
import { getFMCSADataByDOT } from '@/lib/services/fmcsa-db';
import type { ProcessedFilloutData } from '@/lib/types/fillout';
import type { FMCSARecord } from '@/lib/types/fmcsa';

export interface CombinedFilloutFMCSAData {
  filloutData: ProcessedFilloutData;
  fmcsaData: FMCSARecord | null;
  dotNumber: string | null;
  dataSource?: 'api' | 'database' | 'mock'; // Track where the data came from
}

/**
 * GET /api/fillout?submissionId=xxx
 * Fetches Fillout submission, extracts DOT, fetches FMCSA data, and returns combined data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const submissionId = searchParams.get('submissionId');
    const formId = searchParams.get('formId'); // Optional formId to speed up search

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId is required' },
        { status: 400 }
      );
    }

    // Fetch Fillout submission (will search through forms if formId not provided)
    const submission = await getSubmission(submissionId, formId || undefined);
    
    // Process Fillout data
    const filloutData = processFilloutSubmission(submission);

    // Extract DOT number
    const dotNumber = extractDOTNumber(submission);

    if (!dotNumber) {
      return NextResponse.json(
        {
          error: 'DOT number not found in Fillout submission',
          filloutData,
          hint: 'Make sure the form includes a DOT number field',
        },
        { status: 400 }
      );
    }

    // Fetch FMCSA data
    let fmcsaData: FMCSARecord | null = null;
    let dataSource: 'api' | 'database' | 'mock' = 'database';
    try {
      const result = await getFMCSADataByDOT(dotNumber);
      fmcsaData = result.data;
      dataSource = result.source;
    } catch (error) {
      console.error('Error fetching FMCSA data:', error);
      // Continue even if FMCSA data fetch fails
    }

    const combined: CombinedFilloutFMCSAData = {
      filloutData,
      fmcsaData,
      dotNumber,
      dataSource,
    };

    return NextResponse.json(combined);
  } catch (error) {
    console.error('Error processing Fillout submission:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process Fillout submission',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fillout
 * Accepts a Fillout submission object directly (for webhooks or manual submission)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const submission = body.submission || body;

    if (!submission) {
      return NextResponse.json(
        { error: 'submission is required in request body' },
        { status: 400 }
      );
    }

    // Process Fillout data
    const filloutData = processFilloutSubmission(submission);

    // Extract DOT number
    const dotNumber = extractDOTNumber(submission);

    if (!dotNumber) {
      return NextResponse.json(
        {
          error: 'DOT number not found in Fillout submission',
          filloutData,
          hint: 'Make sure the form includes a DOT number field',
        },
        { status: 400 }
      );
    }

    // Fetch FMCSA data
    let fmcsaData: FMCSARecord | null = null;
    let dataSource: 'api' | 'database' | 'mock' = 'database';
    try {
      const result = await getFMCSADataByDOT(dotNumber);
      fmcsaData = result.data;
      dataSource = result.source;
    } catch (error) {
      console.error('Error fetching FMCSA data:', error);
      // Continue even if FMCSA data fetch fails
    }

    const combined: CombinedFilloutFMCSAData = {
      filloutData,
      fmcsaData,
      dotNumber,
      dataSource,
    };

    return NextResponse.json(combined);
  } catch (error) {
    console.error('Error processing Fillout submission:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process Fillout submission',
      },
      { status: 500 }
    );
  }
}

