import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify Fillout API key and inspect response structure
 * GET /api/fillout/test?formId=xxx (optional) or ?submissionId=xxx
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.FILLOUT_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'FILLOUT_API_KEY is not configured',
        hint: 'Add FILLOUT_API_KEY to your .env.local file'
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const formId = searchParams.get('formId');
  const submissionId = searchParams.get('submissionId');

  try {
    // Try to fetch form metadata first (if formId provided)
    if (formId) {
      // Try /v1/api/forms/{formId} first
      let formResponse = await fetch(`https://api.fillout.com/v1/api/forms/${formId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      let formData = await formResponse.json();

      // If that fails, try /v1/forms/{formId}
      if (!formResponse.ok && formResponse.status === 404) {
        formResponse = await fetch(`https://api.fillout.com/v1/forms/${formId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        formData = await formResponse.json();
      }

      if (!formResponse.ok) {
        return NextResponse.json({
          success: false,
          endpoint: formResponse.url,
          status: formResponse.status,
          error: formData,
          triedEndpoints: [
            `https://api.fillout.com/v1/api/forms/${formId}`,
            `https://api.fillout.com/v1/forms/${formId}`
          ]
        }, { status: formResponse.status });
      }

      // Try to get submissions for this form
      let submissionsResponse = await fetch(
        `https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // If that fails, try without /api
      if (!submissionsResponse.ok && submissionsResponse.status === 404) {
        submissionsResponse = await fetch(
          `https://api.fillout.com/v1/forms/${formId}/submissions?limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const submissionsData = await submissionsResponse.json();

      return NextResponse.json({
        success: true,
        apiKeyConfigured: true,
        formMetadata: formData,
        sampleSubmission: submissionsResponse.ok ? submissionsData : { error: 'Could not fetch submissions', details: submissionsData },
        note: 'Check the structure of formMetadata and sampleSubmission to understand the data format'
      });
    }

    // Try to fetch a specific submission (if submissionId provided)
    if (submissionId) {
      // Try /v1/api/submissions/{submissionId} first
      let submissionResponse = await fetch(
        `https://api.fillout.com/v1/api/submissions/${submissionId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let submissionData = await submissionResponse.json();

      // If that fails, try /v1/submissions/{submissionId}
      if (!submissionResponse.ok && submissionResponse.status === 404) {
        submissionResponse = await fetch(
          `https://api.fillout.com/v1/submissions/${submissionId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        submissionData = await submissionResponse.json();
      }

      if (!submissionResponse.ok) {
        return NextResponse.json({
          success: false,
          endpoint: submissionResponse.url,
          status: submissionResponse.status,
          error: submissionData,
          triedEndpoints: [
            `https://api.fillout.com/v1/api/submissions/${submissionId}`,
            `https://api.fillout.com/v1/submissions/${submissionId}`
          ]
        }, { status: submissionResponse.status });
      }

      return NextResponse.json({
        success: true,
        apiKeyConfigured: true,
        submission: submissionData,
        note: 'Check the structure of submission to understand the data format'
      });
    }

    // If no formId or submissionId, try different endpoint variations
    // Try /v1/api/forms first (based on documentation)
    let formsResponse = await fetch('https://api.fillout.com/v1/api/forms?limit=5', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    let formsData = await formsResponse.json();

    // If that fails, try /v1/forms
    if (!formsResponse.ok && formsResponse.status === 404) {
      formsResponse = await fetch('https://api.fillout.com/v1/forms?limit=5', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      formsData = await formsResponse.json();
    }

    if (!formsResponse.ok) {
      return NextResponse.json({
        success: false,
        endpoint: formsResponse.url,
        status: formsResponse.status,
        error: formsData,
        hint: 'Check your API key format. Fillout uses Bearer token authentication. Also verify the endpoint URL is correct.',
        triedEndpoints: [
          'https://api.fillout.com/v1/api/forms',
          'https://api.fillout.com/v1/forms'
        ]
      }, { status: formsResponse.status });
    }

    return NextResponse.json({
      success: true,
      apiKeyConfigured: true,
      apiKeyValid: true,
      forms: formsData,
      note: 'API key is valid! Provide ?formId=xxx or ?submissionId=xxx to see detailed structure',
      usage: {
        testForm: `/api/fillout/test?formId=YOUR_FORM_ID`,
        testSubmission: `/api/fillout/test?submissionId=YOUR_SUBMISSION_ID`
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

