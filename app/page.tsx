'use client';

import { useState } from 'react';
import { RecommendationsDisplay } from './components/RecommendationsDisplay';
import { FMCSADataDisplay } from './components/FMCSADataDisplay';
import { FilloutDataDisplay } from './components/FilloutDataDisplay';
import { generateRecommendations, generateRecommendationsAI } from '@/lib/services/recommendations';
import { generateSafetyEmail } from '@/lib/services/email-template';
import type { EmailRecommendation } from '@/lib/types/email';
import type { ProcessedFilloutData } from '@/lib/types/fillout';
import type { CombinedFilloutFMCSAData } from '@/app/api/fillout/route';

export default function Home() {
  const [recommendations, setRecommendations] = useState<EmailRecommendation[]>([]);
  const [emailOutput, setEmailOutput] = useState<{ subject: string; body: string; htmlBody: string } | null>(null);
  const [viewMode, setViewMode] = useState<'email' | 'recommendations'>('email');
  const [useAI] = useState(true); // Always use AI - removed toggle
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filloutSubmissionId, setFilloutSubmissionId] = useState<string>('');
  const [filloutData, setFilloutData] = useState<ProcessedFilloutData | null>(null);
  const [fmcsaData, setFmcsaData] = useState<any>(null); // Store FMCSA data to display raw violations
  const [dataSource, setDataSource] = useState<'api' | 'database' | 'mock' | null>(null);

  // Removed handleToggleAI - AI is always enabled

  const handleFilloutSubmit = async () => {
    if (!filloutSubmissionId.trim()) {
      setError('Please enter a Fillout submission ID');
      return;
    }

    // Clear all previous data FIRST to prevent showing old content
    setRecommendations([]);
    setEmailOutput(null);
    setFilloutData(null);
    setFmcsaData(null);
    setError(null);
    setSuccess(null);
    
    // Then set loading states
    setLoading(true);
    setAnalyzing(false);
    setGeneratingEmail(false);

    try {
      // Fetch Fillout data and combine with FMCSA
      const response = await fetch(`/api/fillout?submissionId=${filloutSubmissionId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Fillout data');
      }

      const combined: CombinedFilloutFMCSAData = await response.json();
      
      if (!combined.fmcsaData) {
        throw new Error(`No FMCSA data found for DOT number: ${combined.dotNumber || 'unknown'}`);
      }

      setFilloutData(combined.filloutData);
      setFmcsaData(combined.fmcsaData); // Store for display
      setDataSource(combined.dataSource || 'database'); // Store data source
      
      // Data is now loaded, start analysis phase
      setLoading(false); // Stop the initial loading state
      setAnalyzing(true); // Start the analysis indicator

      // Generate recommendations with Fillout context (Analysis Phase)
      let recs: EmailRecommendation[];
      
      if (useAI) {
        recs = await generateRecommendationsAI({
          fmcsaData: combined.fmcsaData,
          filloutData: combined.filloutData,
          customPrompt: customPrompt || undefined,
        });
      } else {
        recs = generateRecommendations({
          fmcsaData: combined.fmcsaData,
          filloutData: combined.filloutData,
        });
      }

      setRecommendations(recs);
      
      // Analysis complete, start email generation
      setAnalyzing(false);
      setGeneratingEmail(true);

      // Generate email output with Fillout personalization (Email Generation Phase)
      const email = await generateSafetyEmail({
        companyName: combined.filloutData.companyInfo.companyName,
        customerName: combined.filloutData.contactInfo.safetyContactName,
        fmcsaData: combined.fmcsaData,
        recommendations: recs,
        filloutData: combined.filloutData,
        useAI: useAI,
      });
      setEmailOutput(email);
      setSuccess('Email generated successfully! Ready to copy or send.');
      setTimeout(() => setSuccess(null), 5000); // Auto-dismiss after 5 seconds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process Fillout submission');
      console.error('Fillout submission error:', err);
    } finally {
      setLoading(false);
      setAnalyzing(false);
      setGeneratingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Safety Agent
            </h1>
            <p className="mt-2 text-gray-600">
              Generate personalized safety recommendations and welcome emails for motor carriers
            </p>
          </div>
        </div>

        {/* Main Input Section */}
        <div className="mb-8 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Generate Safety Email
            </h2>
            <p className="text-gray-600">
              Enter a Fillout submission ID to generate a personalized safety recommendations email
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fillout Submission ID
              </label>
              <input
                type="text"
                value={filloutSubmissionId}
                onChange={(e) => setFilloutSubmissionId(e.target.value)}
                placeholder="e.g., c2dce870-9a86-4ce8-a0da-c5ca8321a5ac"
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && filloutSubmissionId.trim()) {
                    handleFilloutSubmit();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilloutSubmit}
                disabled={loading || !filloutSubmissionId.trim()}
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-shadow"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Email'
                )}
              </button>
            </div>
          </div>
          {filloutData && fmcsaData && (
            <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  <strong>All data loaded successfully:</strong> {filloutData.companyInfo.companyName || fmcsaData.legalName || 'Company name not found'}
                  {(filloutData.companyInfo.dotNumber || fmcsaData.dotNumber) && ` • DOT: ${filloutData.companyInfo.dotNumber || fmcsaData.dotNumber}`}
                </p>
              </div>
            </div>
          )}
          
          {/* Analysis Loading State - Shows after data is loaded */}
          {analyzing && filloutData && fmcsaData && (
            <div className="mt-4 rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <p className="text-sm font-medium text-purple-900">Analyzing safety data...</p>
                  <p className="text-xs text-purple-700 mt-1">Reviewing FMCSA violations and generating recommendations</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Email Generation Loading State - Shows after analysis is complete */}
          {generatingEmail && filloutData && fmcsaData && !success && (
            <div className="mt-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Generating personalized email...</p>
                  <p className="text-xs text-blue-700 mt-1">Drafting email with recommendations and safety insights</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message - Replaces loading indicator */}
          {success && filloutData && fmcsaData && (
            <div className="mt-4 rounded-lg border-2 border-green-300 bg-green-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-green-800">
                    {success}
                  </p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="text-green-600 hover:text-green-800 focus:outline-none"
                  aria-label="Dismiss"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </p>
            <p className="mt-1 text-xs text-red-600">
              Falling back to rule-based recommendations.
            </p>
          </div>
        )}

        {/* Data Display - Collapsible */}
        {filloutData && (
          <details className="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-gray-700 hover:text-gray-900">
              View Data & Violations
            </summary>
            <div className="border-t border-gray-200 p-6 space-y-6">
              {filloutData && (
                <FilloutDataDisplay data={filloutData} />
              )}
              {filloutData && fmcsaData && <FMCSADataDisplay data={fmcsaData} />}
              
              {/* Raw Violations Display */}
              {fmcsaData && fmcsaData.violations && fmcsaData.violations.length > 0 && (
              <details className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-gray-900 hover:text-gray-700">
                  Raw Violations Data ({fmcsaData.violations.length} violations)
                </summary>
                <div className="border-t border-gray-200 p-6">
                  <p className="mb-4 text-sm text-gray-600">
                    This is the raw violation data used to generate recommendations. Verify that real API data is being used.
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Severity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          BASIC
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          OOS
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {fmcsaData.violations.map((violation: any, index: number) => (
                        <tr key={violation.id || index} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {violation.violationDate || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {violation.violationType || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {violation.violationDescription || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                violation.severity === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : violation.severity === 'high'
                                  ? 'bg-orange-100 text-orange-800'
                                  : violation.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {violation.severity || 'N/A'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {violation.basic || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {violation.oosIndicator === 'Y' || violation.oosIndicator === true ? (
                              <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-500">No</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {violation.totalViolations || 1}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-md bg-blue-50 p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Data Source:</strong>{' '}
                    {dataSource === 'api'
                      ? '🚀 Transportation.gov API (Real-time)'
                      : dataSource === 'mock'
                      ? '🧪 Mock Data (Testing)'
                      : '💾 Local Database'}
                  </p>
                </div>
                </div>
              </details>
              )}
            </div>
          </details>
        )}

        {/* Step 1: Analysis Output - Shows during analysis and after completion */}
        {(analyzing || recommendations.length > 0 || (loading && !filloutData)) && (
          <div className="mb-8 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-lg">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-lg font-semibold text-gray-900">
                  Step 1: Review Analysis Output
                  {recommendations.length > 0 && ` (${recommendations.length} recommendations)`}
                </span>
              </div>
            </div>
            {(analyzing || (loading && !filloutData)) && !recommendations.length ? (
              <div className="border-t border-purple-200 px-6 py-8 bg-white">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      {loading && !filloutData ? 'Loading data...' : 'Analyzing safety data...'}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      {loading && !filloutData 
                        ? 'Fetching Fillout and FMCSA data' 
                        : 'Reviewing FMCSA violations and generating recommendations'}
                    </p>
                  </div>
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <details open className="group">
                <summary className="cursor-pointer px-6 py-2 text-sm text-gray-600 hover:text-gray-900 list-none [&::-webkit-details-marker]:hidden border-t border-purple-200">
                  <div className="flex items-center justify-between">
                    <span>View recommendations</span>
                    <svg className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="border-t border-purple-200 px-6 py-6 bg-white">
                  <p className="mb-4 text-sm text-gray-600">
                    These are the recommendations generated by the analysis phase. Review them before proceeding to the final email.
                  </p>
                  <RecommendationsDisplay recommendations={recommendations} />
                </div>
              </details>
            ) : null}
          </div>
        )}

        {/* Step 2: Email Output - Shows during email generation and after completion */}
        {(generatingEmail || emailOutput || (analyzing && recommendations.length > 0)) && (
          <div className="mb-8 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-lg font-semibold text-gray-900">Step 2: Generated Email</span>
              </div>
            </div>
            {(generatingEmail || (analyzing && recommendations.length > 0)) && !emailOutput ? (
              <div className="border-t border-blue-200 px-6 py-8 bg-white">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Generating personalized email...</p>
                    <p className="text-xs text-blue-700 mt-1">Drafting email with recommendations and safety insights</p>
                  </div>
                </div>
              </div>
            ) : emailOutput ? (
              <div className="border-t border-blue-200 bg-white">
                {/* Email Header with Actions */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mt-1 text-sm text-gray-600">Ready to send to your customer</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(emailOutput.htmlBody);
                            alert('✅ Email HTML copied! Paste into Gmail\'s rich text editor');
                          } catch (err) {
                            console.error('Failed to copy:', err);
                            alert('Failed to copy to clipboard');
                          }
                        }}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md hover:shadow-lg transition-all"
                      >
                        📋 Copy Email
                      </button>
                      <button
                        onClick={() => {
                          const subject = encodeURIComponent(emailOutput.subject);
                          const body = encodeURIComponent(emailOutput.body);
                          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
                          window.open(gmailUrl, '_blank');
                        }}
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-md hover:shadow-lg transition-all"
                      >
                        ✉️ Open in Gmail
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Content */}
                <div className="p-6 space-y-6">
                  {/* Subject Line */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Subject Line
                    </label>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-gray-900">{emailOutput.subject}</p>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(emailOutput.subject);
                            alert('✅ Subject copied!');
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* HTML Email Preview */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Email Preview
                      </label>
                      <button
                        onClick={() => setViewMode(viewMode === 'email' ? 'recommendations' : 'email')}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        {viewMode === 'email' ? 'View Raw Data' : 'View Email'}
                      </button>
                    </div>
                    <div className="rounded-lg border-2 border-gray-200 bg-white p-6 max-h-[600px] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: emailOutput.htmlBody }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Raw Recommendations & Data - Toggle View */}
        {viewMode === 'recommendations' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            {recommendations.length > 0 && (
              <RecommendationsDisplay recommendations={recommendations} />
            )}
            <button
              onClick={() => setViewMode('email')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Email View
            </button>
          </div>
        )}

        {!filloutData && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">
              Enter a Fillout submission ID or select a test scenario above to view FMCSA data and generated recommendations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
