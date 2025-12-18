import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { FMCSARecord } from '@/lib/types/fmcsa';
import type { ProcessedFilloutData } from '@/lib/types/fillout';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StrategicRecommendation {
  title: string;
  observation: string;
  action: string;
  owner: string;
}

/**
 * Formats FMCSA data and Fillout context into a readable string for the AI
 */
function formatFMCSADataForAI(
  fmcsaData: FMCSARecord,
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

  return formatted;
}

/**
 * Gets the email drafting prompt - can be customized via environment variable
 * This is separate from the analysis prompt (OPENAI_SYSTEM_PROMPT) to allow
 * different personas for analysis vs. email drafting
 */
function getEmailDraftingPrompt(): string {
  // Always read from file first, as Next.js doesn't handle multi-line env vars well
  // The env var is often truncated or incomplete for multi-line prompts
  let emailPrompt = '';
  
  // Try reading from file (most reliable for multi-line prompts)
  {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        let inPrompt = false;
        let promptLines: string[] = [];
        
        // Look for OPENAI_EMAIL_PROMPT=" or OPENAI_EMAIL_PROMPT= (with or without quotes)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Check if this line starts the prompt
          if (trimmedLine.startsWith('OPENAI_EMAIL_PROMPT=')) {
            inPrompt = true;
            // Extract content after the = sign
            const afterEquals = line.substring(line.indexOf('=') + 1).trim();
            
            // Handle different quote styles
            if (afterEquals.startsWith('"')) {
              // Multi-line quoted prompt
              const content = afterEquals.substring(1); // Remove opening quote
              if (content.endsWith('"') && content.length > 1) {
                // Single line quoted prompt
                emailPrompt = content.slice(0, -1).trim();
                break;
              } else {
                // Multi-line - add first line content
                promptLines.push(content);
              }
            } else if (afterEquals.startsWith("'")) {
              // Single quotes
              const content = afterEquals.substring(1);
              if (content.endsWith("'") && content.length > 1) {
                emailPrompt = content.slice(0, -1).trim();
                break;
              } else {
                promptLines.push(content);
              }
            } else if (afterEquals) {
              // No quotes - single line
              emailPrompt = afterEquals.trim();
              break;
            }
          } else if (inPrompt) {
            // We're inside a multi-line prompt
            const trimmed = line.trim();
            
            // Check for closing quote (on its own line or at end)
            if (trimmed === '"' || trimmed === "'") {
              // End of prompt
              break;
            } else if (trimmed.endsWith('"') && trimmed.length > 1) {
              // Closing quote at end of line
              promptLines.push(trimmed.slice(0, -1));
              break;
            } else if (trimmed.endsWith("'") && trimmed.length > 1) {
              // Closing single quote at end of line
              promptLines.push(trimmed.slice(0, -1));
              break;
            } else {
              // Regular line of the prompt
              promptLines.push(line);
            }
          }
        }
        
        // If we collected lines, join them
        if (promptLines.length > 0) {
          emailPrompt = promptLines.join('\n').trim();
          console.log(`[Email Prompt] ✅ Read ${promptLines.length} lines from file (${emailPrompt.length} chars)`);
        } else {
          console.log(`[Email Prompt] ⚠️  No lines collected from file parsing`);
        }
        } else {
          console.log(`[Email Prompt] ⚠️  .env.local file not found at ${envPath}`);
      }
    } catch (err) {
      console.error('[Email Prompt] ❌ Error reading email prompt from file:', err);
    }
  }
  
  // Fallback to env var if file reading didn't work
  if (!emailPrompt || emailPrompt.length < 100) {
    emailPrompt = process.env.OPENAI_EMAIL_PROMPT?.trim() || '';
  }
  
  // Log what we found for debugging
  if (emailPrompt && emailPrompt.length > 100) {
    console.log(`[Email Prompt] ✅ Loaded custom prompt (${emailPrompt.length} chars)`);
    console.log(`[Email Prompt] Preview: ${emailPrompt.substring(0, 150)}...`);
  } else {
    console.log(`[Email Prompt] ⚠️  Using default prompt (custom prompt length: ${emailPrompt?.length || 0} chars)`);
    if (emailPrompt && emailPrompt.length > 0) {
      console.log(`[Email Prompt] Env var value (truncated): ${emailPrompt.substring(0, 100)}...`);
    }
  }
  
  // Default email drafting prompt if none provided
  if (!emailPrompt) {
    emailPrompt = `You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. You have deep expertise in:
- FMCSA compliance requirements and regulations
- Safety management systems and best practices
- Risk assessment and mitigation strategies
- Insurance industry standards for commercial motor carriers

When drafting strategic recommendations for emails, you:
- Write in a professional, consultative tone suitable for email communication
- Create clear, distinct observations (what you found) and actions (what to do)
- Assign appropriate owners (Safety Manager, Operations Manager, etc.)
- Focus on helping carriers improve their safety rating and reduce insurance premiums
- Make recommendations specific, actionable, and prioritized by risk and impact`;
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
      fmcsaData,
      filloutData,
      customPrompt,
    }: {
      fmcsaData: FMCSARecord;
      filloutData?: ProcessedFilloutData;
      customPrompt?: string;
    } = body;

    if (!fmcsaData) {
      return NextResponse.json(
        { error: 'FMCSA data is required' },
        { status: 400 }
      );
    }

    const formattedData = formatFMCSADataForAI(fmcsaData, filloutData);
    const systemPrompt = getEmailDraftingPrompt(); // Use dedicated email drafting prompt

    const basePrompt = `Analyze the following FMCSA safety profile and generate strategic recommendations in the format specified below.

Your task is to create 3-5 strategic recommendations that will help this carrier:
1. Improve their safety rating
2. Reduce insurance premiums
3. Address specific violations and compliance issues
4. Implement best practices

${filloutData?.operationalData
  ? `IMPORTANT: Use the operational context provided (ELD system, cameras, training programs, etc.) to tailor recommendations. For example:
- If they use a specific ELD system, reference it in HOS recommendations
- If they have dash cameras, incorporate that into unsafe driving recommendations
- If they have training programs, suggest leveraging them for specific areas
- Consider their current tools and processes when making recommendations`
  : ''}

For each recommendation, provide:
- **Title**: A clear, actionable title (e.g., "Establish Regular Vehicle Maintenance Schedule")
- **Observation**: What you observed from the data - be specific about violations, dates, counts, etc. This should be factual and data-driven.
- **Action**: What the carrier should do - be specific, actionable, and include concrete steps. This should be different from the observation.
- **Owner**: Who should be responsible (e.g., "Operations Manager", "Safety Manager", "Fleet Manager", "Maintenance Manager")

IMPORTANT:
- Observation and Action must be DIFFERENT. Observation describes what you found, Action describes what to do about it.
- Be specific about violation counts, dates, and types when available
- Focus on the most critical issues first (high-severity violations, out-of-service violations, compliance deadlines)
- Make actions concrete and implementable

FMCSA Data:
${formattedData}

Return your response as a JSON object with this exact structure:
{
  "recommendations": [
    {
      "title": "Clear, actionable title",
      "observation": "Specific observation about what you found in the data",
      "action": "Specific, actionable steps the carrier should take",
      "owner": "Role responsible (e.g., Operations Manager)"
    }
  ]
}`;

    const prompt = customPrompt 
      ? `${basePrompt}\n\nAdditional Instructions:\n${customPrompt}`
      : basePrompt;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let recommendations: StrategicRecommendation[] = [];
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations.map((rec: any) => ({
          title: rec.title || 'Recommendation',
          observation: rec.observation || '',
          action: rec.action || '',
          owner: rec.owner || 'Safety Manager',
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI Response:', aiResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response', rawResponse: aiResponse },
        { status: 500 }
      );
    }

    // Validate recommendations
    recommendations = recommendations
      .filter((rec) => rec.title && rec.observation && rec.action)
      .slice(0, 5); // Limit to top 5

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate strategic recommendations' },
      { status: 500 }
    );
  }
}

