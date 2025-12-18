import type { FMCSARecord } from '../types/fmcsa';
import type { EmailRecommendation } from '../types/email';
import type { ProcessedFilloutData } from '../types/fillout';
import { generateRecommendations } from './recommendations';

export interface EmailTemplateData {
  companyName?: string;
  customerName?: string;
  fmcsaData: FMCSARecord;
  recommendations: EmailRecommendation[];
  filloutData?: ProcessedFilloutData; // Fillout data for personalization
  useAI?: boolean; // Whether to use AI for strategic recommendations
}

interface SafetyProfileSnapshot {
  strengths: string[];
  focusAreas: Array<{
    area: string;
    details: string;
  }>;
}

/**
 * Analyzes FMCSA data to create a safety profile snapshot
 */
function analyzeSafetyProfile(fmcsaData: FMCSARecord): SafetyProfileSnapshot {
  const strengths: string[] = [];
  const focusAreas: Array<{ area: string; details: string }> = [];

  // Analyze violations by BASIC category
  if (fmcsaData.violations && fmcsaData.violations.length > 0) {
    const violationsByBasic: Record<string, number> = {};
    const recentViolations = fmcsaData.violations.filter((v) => {
      if (!v.violationDate) return false;
      const violationDate = new Date(v.violationDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return violationDate >= sixMonthsAgo;
    });

    recentViolations.forEach((v) => {
      if (v.basic) {
        violationsByBasic[v.basic] = (violationsByBasic[v.basic] || 0) + (v.totalViolations || 1);
      }
    });

    // Check for strengths (low or no violations in key areas)
    const hosViolations = violationsByBasic['HOS'] || violationsByBasic['Hours-of-Service Compliance'] || 0;
    const driverFitnessViolations = violationsByBasic['Driver Fitness'] || 0;
    const controlledSubstancesViolations = violationsByBasic['Controlled Substances'] || 0;

    if (hosViolations === 0) {
      strengths.push('Your Hours of Service compliance is excellent. This shows you are managing logs well—a huge win.');
    }
    if (driverFitnessViolations === 0) {
      strengths.push('Your Driver Fitness score is excellent. This shows you are hiring the right drivers.');
    }
    if (controlledSubstancesViolations === 0) {
      strengths.push('Your Controlled Substances compliance is excellent.');
    }

    // Identify focus areas
    const vehicleMaintenanceViolations = violationsByBasic['Vehicle Maintenance'] || 0;
    if (vehicleMaintenanceViolations > 0) {
      const maintenanceDetails = recentViolations
        .filter((v) => v.basic === 'Vehicle Maintenance')
        .map((v) => v.violationDescription || v.violationType)
        .filter((d, i, arr) => arr.indexOf(d) === i) // unique
        .slice(0, 3)
        .join(', ');

      focusAreas.push({
        area: 'Vehicle Maintenance',
        details: `Currently trending at ${Math.max(50, 100 - vehicleMaintenanceViolations * 5)}%. Reviewing the data, this appears to be driven largely by "${maintenanceDetails}" violations during roadside inspections.`,
      });
    }

    if (hosViolations > 0) {
      focusAreas.push({
        area: 'Hours of Service',
        details: `You have ${hosViolations} Hours of Service violation(s) in the past 6 months.`,
      });
    }

    if (driverFitnessViolations > 0) {
      focusAreas.push({
        area: 'Driver Fitness',
        details: `You have ${driverFitnessViolations} driver fitness violation(s) in the past 6 months.`,
      });
    }
  } else {
    strengths.push('Your overall safety profile shows minimal violations.');
  }

  // Check MCS-150 form date
  if (fmcsaData.mcs150FormDate) {
    const formDate = new Date(fmcsaData.mcs150FormDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    if (formDate < twoYearsAgo) {
      focusAreas.push({
        area: 'Compliance',
        details: 'Your MCS-150 form is over 2 years old and should be updated to maintain compliance.',
      });
    }
  }

  // Check for missing data
  if (fmcsaData.driverTotal === 0) {
    focusAreas.push({
      area: 'Data Completeness',
      details: 'Driver information is missing from your FMCSA profile.',
    });
  }
  if (fmcsaData.vehicleTotal === 0) {
    focusAreas.push({
      area: 'Data Completeness',
      details: 'Vehicle information is missing from your FMCSA profile.',
    });
  }

  return { strengths, focusAreas };
}

/**
 * Generates strategic recommendations using AI (if available) or falls back to rule-based mapping
 */
async function generateStrategicRecommendations(
  recommendations: EmailRecommendation[],
  fmcsaData: FMCSARecord,
  useAI: boolean = false,
  filloutData?: ProcessedFilloutData
): Promise<Array<{
  title: string;
  observation: string;
  action: string;
  owner: string;
}>> {
  // Try AI first if enabled
  // Note: This works in both client and server contexts
  // In server context (API routes), we'd need to import the OpenAI client directly
  // For now, we use fetch which works in both contexts
  if (useAI) {
    try {
      // Determine the base URL - works in both client and server
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/recommendations/strategic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fmcsaData,
          filloutData: filloutData || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recommendations && data.recommendations.length > 0) {
          return data.recommendations;
        }
      }
    } catch (error) {
      console.warn('AI strategic recommendations failed, falling back to rule-based:', error);
    }
  }

  // Fallback to rule-based mapping
  return mapRecommendationsToStrategic(recommendations, fmcsaData);
}

/**
 * Maps recommendations to strategic recommendations with observation, action, and owner (rule-based fallback)
 */
function mapRecommendationsToStrategic(
  recommendations: EmailRecommendation[],
  fmcsaData: FMCSARecord
): Array<{
  title: string;
  observation: string;
  action: string;
  owner: string;
}> {
  const strategic: Array<{ title: string; observation: string; action: string; owner: string }> = [];

  // Map high and medium priority recommendations
  const priorityRecs = recommendations.filter((r) => r.priority === 'high' || r.priority === 'medium');

  priorityRecs.forEach((rec) => {
    let title = rec.title;
    let observation = '';
    let action = '';
    let owner = 'Safety Manager';

    switch (rec.category) {
      case 'Compliance':
        if (rec.title.includes('MCS-150')) {
          observation = 'Your MCS-150 form is over 2 years old.';
          action = 'Update your MCS-150 form to maintain compliance with FMCSA regulations.';
          owner = 'Operations Manager';
        } else if (rec.title.includes('Hours of Service')) {
          observation = `You have ${fmcsaData.violations?.filter((v) => v.basic === 'HOS' || v.basic === 'Hours-of-Service Compliance').length || 0} Hours of Service violation(s).`;
          action = 'Consider implementing an ELD system and driver training to ensure compliance.';
          owner = 'Safety Manager / Fleet Manager';
        } else {
          observation = rec.description;
          action = rec.description;
          owner = 'Safety Manager';
        }
        break;

      case 'Safety':
        if (rec.title.includes('Vehicle Maintenance') || rec.title.includes('Maintenance Issues')) {
          const maintenanceViolations = fmcsaData.violations?.filter(
            (v) => v.basic === 'Vehicle Maintenance'
          ) || [];
          
          // Extract common violation types from violation codes/descriptions
          const violationTypes = maintenanceViolations
            .map((v) => {
              const desc = (v.violationDescription || v.violationType || v.basic || '').toLowerCase();
              const code = (v.violationType || '').toLowerCase();
              if (desc.includes('brake') || code.includes('3937') || code.includes('39375') || code.includes('393')) return 'Brake System';
              if (desc.includes('light') || desc.includes('lamp') || code.includes('3939')) return 'Light/Lamp';
              if (desc.includes('tire') || code.includes('3931')) return 'Tire';
              return null;
            })
            .filter((d): d is 'Brake System' | 'Light/Lamp' | 'Tire' => d !== null);

          const commonTypes = violationTypes.length > 0 
            ? Array.from(new Set(violationTypes)).slice(0, 2).join(' and ')
            : 'brake systems and other critical components';

          const violationCount = maintenanceViolations.length;
          
          observation = `You have ${violationCount} vehicle maintenance violation(s) on record, with issues related to ${commonTypes}. These violations can impact your safety rating and insurance premiums.`;
          action = `Develop and implement a proactive vehicle maintenance schedule that includes routine inspections specifically targeting ${commonTypes}. This will help prevent future maintenance violations and enhance operational safety.`;
          owner = 'Operations Manager';
        } else if (rec.title.includes('Hazmat')) {
          observation = 'As a hazmat carrier, compliance requirements are more stringent.';
          action = 'Ensure all drivers have proper hazmat endorsements and vehicles meet hazmat requirements.';
          owner = 'Safety Manager / Compliance Officer';
        } else if (rec.title.includes('Passenger')) {
          observation = 'Passenger carriers must maintain enhanced safety protocols.';
          action = 'Implement regular vehicle inspections and enhanced safety protocols.';
          owner = 'Safety Manager';
        } else if (rec.title.includes('High-Severity') || rec.title.includes('Severity Violations')) {
          const highSeverityCount = fmcsaData.violations?.filter(
            (v) => v.severity === 'high' || v.severity === 'critical'
          ).length || 0;
          observation = `You have ${highSeverityCount} high-severity violation(s) in the past 6 months, which indicates areas requiring immediate attention.`;
          action = 'Conduct a comprehensive safety review focusing on the violation categories identified. Implement corrective actions and establish monitoring protocols to prevent recurrence.';
          owner = 'Safety Manager';
        } else if (rec.title.includes('Out-of-Service')) {
          const oosCount = fmcsaData.violations?.filter(
            (v) => v.oosIndicator === 'Y' || v.oosIndicator === 'true'
          ).length || 0;
          observation = `You have ${oosCount} out-of-service violation(s) on record. These violations pose significant safety risks and can result in vehicles being taken out of service.`;
          action = 'Immediately address all out-of-service violations. Conduct thorough inspections and repairs before vehicles return to service. Establish preventive maintenance protocols to avoid future OOS violations.';
          owner = 'Safety Manager / Maintenance Manager';
        } else if (rec.title.includes('Driver Fitness')) {
          const driverFitnessCount = fmcsaData.violations?.filter(
            (v) => v.basic === 'Driver Fitness'
          ).length || 0;
          observation = `You have ${driverFitnessCount} driver fitness violation(s), which may indicate issues with CDL validity, medical certificates, or driver qualifications.`;
          action = 'Audit all driver files to ensure CDLs are valid and medical certificates are current. Implement a tracking system to monitor expiration dates and ensure timely renewals.';
          owner = 'Safety Manager / HR Manager';
        } else {
          // For any other safety recommendations, create distinct observation and action
          observation = rec.description || 'A safety concern has been identified that requires attention.';
          action = rec.description 
            ? `Address the issue: ${rec.description.toLowerCase()}`
            : 'Review the safety concern and implement appropriate corrective measures.';
          owner = 'Safety Manager';
        }
        break;

      case 'Operations':
        if (rec.title.includes('Driver Information') || rec.title.includes('Vehicle Information')) {
          observation = 'Driver or vehicle information is missing from your FMCSA profile.';
          action = 'Ensure all active drivers and vehicles are properly registered with FMCSA.';
          owner = 'Operations Manager';
        } else if (rec.title.includes('High Mileage')) {
          observation = 'High mileage operations require enhanced maintenance schedules.';
          action = 'Implement enhanced maintenance schedules and driver monitoring programs.';
          owner = 'Maintenance Manager / Fleet Manager';
        } else {
          observation = rec.description;
          action = rec.description;
          owner = 'Operations Manager';
        }
        break;

      default:
        observation = rec.description;
        action = rec.description;
        owner = 'Safety Manager';
    }

    strategic.push({ title, observation, action, owner });
  });

  // Limit to top 3-5 most important
  return strategic.slice(0, 5);
}

/**
 * Generates a professional email in the gold standard format
 */
export async function generateSafetyEmail(data: EmailTemplateData): Promise<{
  subject: string;
  body: string;
  htmlBody: string;
}> {
  const { companyName, customerName, fmcsaData, recommendations, filloutData, useAI = false } = data;

  // If AI is enabled, generate the entire email using AI
  if (useAI) {
    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/email/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          customerName,
          fmcsaData,
          recommendations,
          filloutData,
        }),
      });

      if (response.ok) {
        const aiEmail = await response.json();
        console.log('[Email Generation] ✅ Generated complete email using AI');
        return aiEmail;
      } else {
        console.warn('[Email Generation] ⚠️  AI email generation failed, falling back to template');
        const errorData = await response.json();
        console.error('[Email Generation] Error:', errorData);
      }
    } catch (error) {
      console.error('[Email Generation] Error calling AI email endpoint:', error);
      console.warn('[Email Generation] Falling back to template-based email');
    }
  }

  // Fallback to template-based email (original implementation)

  // Use Fillout data for personalization if available
  const filloutCompanyName = filloutData?.companyInfo?.companyName;
  const filloutContactName = filloutData?.contactInfo?.safetyContactName;
  
  const company = companyName || filloutCompanyName || fmcsaData.legalName || fmcsaData.dbaName || 'your company';
  const greeting = customerName || filloutContactName 
    ? `Hi ${customerName || filloutContactName},` 
    : `Hi Team ${company},`;

  const subject = `Safety Roadmap & Initial Insights: ${company}`;

  const snapshot = analyzeSafetyProfile(fmcsaData);
  const strategicRecs = await generateStrategicRecommendations(recommendations, fmcsaData, useAI, filloutData);

  // Plain text body
  let body = `${greeting}\n\n`;
  body += `Thank you for taking the time to share your fleet details with us via the intake form. We know how busy you are keeping the trucks moving, and we appreciate the opportunity to support your safety goals.\n\n`;
  body += `Based on the information you provided and a preliminary review of your FMCSA safety profile, we have put together a high-level roadmap to help position ${company} for the best possible insurance outcomes.\n\n`;

  // Current Safety Profile Snapshot
  // When AI is enabled, use only 1 strength (as per prompt instructions)
  // Otherwise, use rule-based analysis
  body += `Current Safety Profile Snapshot\n`;
  if (useAI && snapshot.strengths.length > 0) {
    // AI prompt says "Identify 1 positive data point" - limit to 1
    body += `Strength: ${snapshot.strengths[0]}\n`;
  } else if (snapshot.strengths.length > 0) {
    // Rule-based: show all strengths
    body += `Strength: ${snapshot.strengths.join(' ')}\n`;
  }
  if (snapshot.focusAreas.length > 0) {
    snapshot.focusAreas.forEach((area) => {
      body += `Focus Area: We noticed the ${area.area} ${area.details}\n`;
    });
  }

  // Strategic Recommendations
  if (strategicRecs.length > 0) {
    body += `\nStrategic Recommendations (90-Day Roadmap)\n`;
    body += `To lower your risk profile and improve your safety score, we recommend the following actions:\n\n`;

    strategicRecs.forEach((rec, index) => {
      body += `${index + 1}. ${rec.title || 'Strategic Action'}\n`;
      body += `Observation: ${rec.observation}\n`;
      body += `Action: ${rec.action}\n`;
      body += `Owner: ${rec.owner}.\n\n`;
    });
  }

  // Next Steps
  body += `Next Steps\n`;
  body += `We would love to help you implement these changes. Please reply to this email if you would like us to send over a complimentary Pre-Trip Inspection Checklist or if you are ready to upload your current manual for review.\n\n`;
  body += `Here is to a safe year ahead!\n\n`;
  body += `The Safety Team`;

  // HTML body
  let htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>${escapeHtml(greeting)}</p>
      
      <p>Thank you for taking the time to share your fleet details with us via the intake form. We know how busy you are keeping the trucks moving, and we appreciate the opportunity to support your safety goals.</p>
      
      <p>Based on the information you provided and a preliminary review of your FMCSA safety profile, we have put together a high-level roadmap to help position <strong>${escapeHtml(company)}</strong> for the best possible insurance outcomes.</p>
      
      <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">Current Safety Profile Snapshot</h2>
  `;

  if (snapshot.strengths.length > 0) {
    // When AI is enabled, use only 1 strength (as per prompt instructions)
    const strengthText = useAI ? snapshot.strengths[0] : snapshot.strengths.join(' ');
    htmlBody += `
      <div style="background-color: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
        <p style="margin: 0;"><strong>Strength:</strong> ${escapeHtml(strengthText)}</p>
      </div>
    `;
  }

  if (snapshot.focusAreas.length > 0) {
    snapshot.focusAreas.forEach((area) => {
      htmlBody += `
        <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0;">
          <p style="margin: 0;"><strong>Focus Area:</strong> We noticed the ${escapeHtml(area.area)} ${escapeHtml(area.details)}</p>
        </div>
      `;
    });
  }

  if (strategicRecs.length > 0) {
    htmlBody += `
      <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">Strategic Recommendations (90-Day Roadmap)</h2>
      <p>To lower your risk profile and improve your safety score, we recommend the following actions:</p>
    `;

    strategicRecs.forEach((rec, index) => {
      htmlBody += `
        <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 4px;">
          <p style="margin: 0 0 10px 0;"><strong>${index + 1}. ${escapeHtml(rec.title)}</strong></p>
          <p style="margin: 5px 0;"><strong>Observation:</strong> ${escapeHtml(rec.observation)}</p>
          <p style="margin: 5px 0;"><strong>Action:</strong> ${escapeHtml(rec.action)}</p>
          <p style="margin: 5px 0;"><strong>Owner:</strong> ${escapeHtml(rec.owner)}.</p>
        </div>
      `;
    });
  }

  htmlBody += `
      <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">Next Steps</h2>
      <p>We would love to help you implement these changes. Please reply to this email if you would like us to send over a complimentary Pre-Trip Inspection Checklist or if you are ready to upload your current manual for review.</p>
      
      <p>Here is to a safe year ahead!</p>
      
      <p>The Safety Team</p>
    </body>
    </html>
  `;

  return {
    subject,
    body,
    htmlBody,
  };
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

