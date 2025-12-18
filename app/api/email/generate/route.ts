import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { FMCSARecord } from '@/lib/types/fmcsa';
import type { ProcessedFilloutData } from '@/lib/types/fillout';
import type { EmailRecommendation } from '@/lib/types/email';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Formats FMCSA data and recommendations for the AI email generation
 */
function formatDataForEmail(
  fmcsaData: FMCSARecord,
  recommendations: EmailRecommendation[],
  filloutData?: ProcessedFilloutData
): string {
  let formatted = `FMCSA Safety Profile for ${fmcsaData.legalName || fmcsaData.dbaName || 'Carrier'}:\n\n`;
  
  if (fmcsaData.dotNumber) {
    formatted += `DOT Number: ${fmcsaData.dotNumber}\n`;
  }
  if (fmcsaData.legalName) {
    formatted += `Legal Name: ${fmcsaData.legalName}\n`;
  }
  if (fmcsaData.dbaName) {
    formatted += `DBA Name: ${fmcsaData.dbaName}\n`;
  }
  if (fmcsaData.carrierOperation) {
    formatted += `Carrier Operation: ${fmcsaData.carrierOperation}\n`;
  }
  if (fmcsaData.cargoCarried) {
    formatted += `Cargo Carried: ${fmcsaData.cargoCarried}\n`;
  }
  if (fmcsaData.driverTotal !== undefined) {
    formatted += `Total Drivers: ${fmcsaData.driverTotal}\n`;
  }
  if (fmcsaData.vehicleTotal !== undefined) {
    formatted += `Total Vehicles: ${fmcsaData.vehicleTotal}\n`;
  }
  if (fmcsaData.mcs150FormDate) {
    const formDate = new Date(fmcsaData.mcs150FormDate);
    const yearsOld = (Date.now() - formDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    formatted += `MCS-150 Form Date: ${fmcsaData.mcs150FormDate} (${yearsOld.toFixed(1)} years ago)\n`;
  }
  if (fmcsaData.mcs150Mileage !== undefined) {
    formatted += `MCS-150 Mileage: ${fmcsaData.mcs150Mileage.toLocaleString()}\n`;
  }

  if (fmcsaData.violations && fmcsaData.violations.length > 0) {
    formatted += `\nViolations (${fmcsaData.violations.length} total):\n`;
    
    // Group by BASIC category
    const violationsByBasic: Record<string, typeof fmcsaData.violations> = {};
    fmcsaData.violations.forEach((v) => {
      const basic = v.basic || 'Other';
      if (!violationsByBasic[basic]) {
        violationsByBasic[basic] = [];
      }
      violationsByBasic[basic].push(v);
    });

    Object.entries(violationsByBasic).forEach(([basic, violations]) => {
      formatted += `\n${basic} (${violations.length} violation(s)):\n`;
      violations.forEach((v) => {
        if (v.violationDate) {
          const violationDate = new Date(v.violationDate);
          const monthsAgo = (Date.now() - violationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
          formatted += `  - ${v.violationDescription || v.violationType || 'Violation'} (${monthsAgo.toFixed(1)} months ago)`;
          if (v.severity) {
            formatted += ` [Severity: ${v.severity}]`;
          }
          if (v.oosIndicator === 'Y' || v.oosIndicator === 'true' || String(v.oosIndicator) === 'true') {
            formatted += ` [Out-of-Service]`;
          }
          formatted += `\n`;
        }
      });
    });
  } else {
    formatted += `\nNo violations on record.\n`;
  }

  // Add Fillout operational data if available
  if (filloutData?.operationalData) {
    formatted += `\n\nOperational Context from Intake Form:\n`;
    if (filloutData.operationalData.eldSystem) {
      formatted += `ELD System: ${filloutData.operationalData.eldSystem}\n`;
    }
    if (filloutData.operationalData.dashCameras || filloutData.operationalData.cameraSystem) {
      formatted += `Camera System: ${filloutData.operationalData.dashCameras || filloutData.operationalData.cameraSystem}\n`;
    }
    if (filloutData.operationalData.trainingProvider) {
      formatted += `Training Provider: ${filloutData.operationalData.trainingProvider}\n`;
    }
    if (filloutData.operationalData.maintenanceProgram) {
      formatted += `Maintenance Program: ${filloutData.operationalData.maintenanceProgram}\n`;
    }
    if (filloutData.operationalData.driverCount) {
      formatted += `Driver Count: ${filloutData.operationalData.driverCount}\n`;
    }
  }

  // Add recommendations from analysis
  if (recommendations.length > 0) {
    formatted += `\n\nSafety Recommendations (from analysis):\n`;
    recommendations.forEach((rec, index) => {
      formatted += `${index + 1}. [${rec.category}] ${rec.title}: ${rec.description} (Priority: ${rec.priority})\n`;
    });
  }

  return formatted;
}

/**
 * Gets the email drafting prompt - reads from .env.local file
 */
function getEmailDraftingPrompt(): string {
  let emailPrompt = '';
  
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      let inPrompt = false;
      let promptLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('OPENAI_EMAIL_PROMPT=')) {
          inPrompt = true;
          const afterEquals = line.substring(line.indexOf('=') + 1).trim();
          
          if (afterEquals.startsWith('"')) {
            const content = afterEquals.substring(1);
            if (content.endsWith('"') && content.length > 1) {
              emailPrompt = content.slice(0, -1).trim();
              break;
            } else {
              promptLines.push(content);
            }
          } else if (afterEquals.startsWith("'")) {
            const content = afterEquals.substring(1);
            if (content.endsWith("'") && content.length > 1) {
              emailPrompt = content.slice(0, -1).trim();
              break;
            } else {
              promptLines.push(content);
            }
          } else if (afterEquals) {
            emailPrompt = afterEquals.trim();
            break;
          }
        } else if (inPrompt) {
          const trimmed = line.trim();
          if (trimmed === '"' || trimmed === "'") {
            break;
          } else if (trimmed.endsWith('"') && trimmed.length > 1) {
            promptLines.push(trimmed.slice(0, -1));
            break;
          } else if (trimmed.endsWith("'") && trimmed.length > 1) {
            promptLines.push(trimmed.slice(0, -1));
            break;
          } else {
            promptLines.push(line);
          }
        }
      }
      
      if (promptLines.length > 0) {
        emailPrompt = promptLines.join('\n').trim();
        console.log(`[Email Generation] ✅ Loaded email prompt from file (${emailPrompt.length} chars)`);
      }
    }
  } catch (err) {
    console.error('[Email Generation] Error reading email prompt from file:', err);
  }
  
  // Fallback to env var
  if (!emailPrompt || emailPrompt.length < 100) {
    emailPrompt = process.env.OPENAI_EMAIL_PROMPT?.trim() || '';
  }
  
  if (!emailPrompt || emailPrompt.length < 100) {
    console.log(`[Email Generation] ⚠️  No custom email prompt found, using default`);
    emailPrompt = `You are a professional safety compliance consultant. Draft a welcome email with safety recommendations based on the provided data.`;
  }
  
  return emailPrompt;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      customerName,
      fmcsaData,
      recommendations,
      filloutData,
    }: {
      companyName?: string;
      customerName?: string;
      fmcsaData: FMCSARecord;
      recommendations: EmailRecommendation[];
      filloutData?: ProcessedFilloutData;
    } = body;

    if (!fmcsaData) {
      return NextResponse.json(
        { error: 'FMCSA data is required' },
        { status: 400 }
      );
    }

    const formattedData = formatDataForEmail(fmcsaData, recommendations, filloutData);
    const systemPrompt = getEmailDraftingPrompt();

    const userPrompt = `Generate a complete welcome email based on the following data and recommendations.

Company Information:
- Company Name: ${companyName || filloutData?.companyInfo?.companyName || fmcsaData.legalName || 'Carrier'}
- Customer Name: ${customerName || filloutData?.contactInfo?.safetyContactName || 'Team'}

Data and Recommendations:
${formattedData}

IMPORTANT FORMATTING INSTRUCTIONS:
- When you see [brackets] in the format instructions, they are PLACEHOLDERS - do NOT include the brackets or placeholder text in your output
- For recommendation titles, write ONLY the actual title (e.g., "Leverage ELD System" not "[Recommendation Title 1 - Leverage ELD System]")
- Do NOT include numbering, brackets, or format labels in the actual email content
- Write the recommendation titles directly without any prefixes or labels

HTML FORMATTING REQUIREMENTS:
- Use proper HTML structure with <p>, <div>, <h2>, <h3>, <ul>, <li> tags
- Add spacing between sections using margin or padding (e.g., style="margin-bottom: 20px;" or <div style="margin-bottom: 24px;">)
- Each recommendation should be clearly separated with adequate spacing (at least 16-24px margin between recommendations)
- Use proper heading hierarchy (h2 for main sections, h3 for subsections)
- Ensure recommendations are visually distinct with proper spacing, not just a wall of text
- Use line breaks and paragraph tags to create readable, well-spaced content
- Consider using <div> containers with margin-bottom for each recommendation to ensure clear separation

Generate the complete email following the format and instructions in your system prompt. Return the email as a JSON object with this structure:
{
  "subject": "Email subject line",
  "body": "Plain text email body",
  "htmlBody": "HTML formatted email body (with proper HTML tags, inline styles, spacing, etc.)"
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let emailOutput: { subject: string; body: string; htmlBody: string } | null = null;
    try {
      const parsed = JSON.parse(aiResponse);
      
      // Clean up any brackets or format labels that slipped through
      const cleanText = (text: string): string => {
        if (!text) return text;
        // Remove patterns like "[Recommendation Title 1 - " or "[Recommendation Title 2]"
        return text
          .replace(/\[Recommendation Title \d+\s*-\s*/gi, '')
          .replace(/\[Recommendation Title \d+\]/gi, '')
          .replace(/\[Title \d+\s*-\s*/gi, '')
          .replace(/\[Title \d+\]/gi, '')
          .replace(/^\d+\.\s*\[/, '') // Remove leading numbers and brackets
          .trim();
      };
      
      // Ensure proper spacing in HTML between recommendations
      const formatHtmlSpacing = (html: string): string => {
        if (!html) return html;
        
        // Add spacing between recommendations - ensure each recommendation section has margin
        let formatted = html;
        
        // Add margin-bottom to recommendation containers if they don't have spacing
        // Look for patterns that suggest recommendations (strong tags with titles, followed by observation/action)
        formatted = formatted.replace(
          /(<(?:div|p)[^>]*>[\s\S]{0,500}?<strong[^>]*>.*?<\/strong>[\s\S]{0,500}?Observation[\s\S]{0,500}?Action[\s\S]{0,500}?<\/(?:div|p)>)(?=\s*<(?:div|p)[^>]*>[\s\S]{0,500}?<strong)/gi,
          (match) => {
            // If it doesn't already have margin-bottom style, add it
            if (!match.includes('margin-bottom') && !match.includes('marginBottom') && !match.includes('margin:')) {
              // Try to add style to the opening tag
              return match.replace(/<(div|p)([^>]*)>/i, '<$1$2 style="margin-bottom: 24px;">');
            }
            return match;
          }
        );
        
        return formatted;
      };
      
      emailOutput = {
        subject: cleanText(parsed.subject || `Safety Roadmap & Initial Insights: ${companyName || 'Carrier'}`),
        body: cleanText(parsed.body || ''),
        htmlBody: formatHtmlSpacing(cleanText(parsed.htmlBody || parsed.body || '')),
      };
    } catch (parseError) {
      console.error('Failed to parse AI email response:', parseError);
      console.error('AI Response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI email response', rawResponse: aiResponse },
        { status: 500 }
      );
    }

    if (!emailOutput.body && !emailOutput.htmlBody) {
      return NextResponse.json(
        { error: 'AI did not generate email content' },
        { status: 500 }
      );
    }

    return NextResponse.json(emailOutput);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email' },
      { status: 500 }
    );
  }
}

