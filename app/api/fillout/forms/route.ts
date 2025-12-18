import { NextRequest, NextResponse } from 'next/server';
import { getAllForms } from '@/lib/services/fillout';

/**
 * GET /api/fillout/forms
 * Returns a list of all Fillout forms with their IDs and names
 */
export async function GET(request: NextRequest) {
  try {
    const forms = await getAllForms();
    
    return NextResponse.json({
      success: true,
      count: forms.length,
      forms: forms,
    });
  } catch (error) {
    console.error('Error fetching Fillout forms:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Fillout forms',
      },
      { status: 500 }
    );
  }
}
