import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { FMCSARecord } from '@/lib/types/fmcsa';
import type { EmailRecommendation } from '@/lib/types/email';
import type { ProcessedFilloutData } from '@/lib/types/fillout';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // Add Fillout operational context if available
  if (filloutData?.operationalData) {
    formatted += `\n--- Operational Context from Fillout Form ---\n`;
    const ops = filloutData.operationalData;
    if (ops.eldSystem) {
      formatted += `ELD System: ${ops.eldSystem}\n`;
    }
    if (ops.dashCameras) {
      formatted += `Dash Cameras: ${ops.dashCameras}\n`;
    }
    if (ops.cameraSystem) {
      formatted += `Camera System: ${ops.cameraSystem}\n`;
    }
    if (ops.trainingProvider) {
      formatted += `Training Provider: ${ops.trainingProvider}\n`;
    }
    if (ops.trainingFrequency) {
      formatted += `Training Frequency: ${ops.trainingFrequency}\n`;
    }
    if (ops.maintenanceShop) {
      formatted += `Maintenance Shop: ${ops.maintenanceShop}\n`;
    }
    if (ops.maintenanceProgram) {
      formatted += `Maintenance Program: ${ops.maintenanceProgram}\n`;
    }
    if (ops.driverCount !== undefined) {
      formatted += `Company Drivers (W2): ${ops.driverCount}\n`;
    }
    if (ops.ownerOperatorCount !== undefined) {
      formatted += `Owner Operators (1099): ${ops.ownerOperatorCount}\n`;
    }
    formatted += '\n';
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
 * Parses AI response into EmailRecommendation format
 */
function parseAIRecommendations(aiResponse: string): EmailRecommendation[] {
  const recommendations: EmailRecommendation[] = [];
  
  // Try to parse JSON first
  try {
    const parsed = JSON.parse(aiResponse);
    if (Array.isArray(parsed)) {
      return parsed.map((rec: any) => ({
        category: rec.category || 'Safety',
        title: rec.title || rec.recommendation || 'Recommendation',
        description: rec.description || rec.details || rec.recommendation || '',
        priority: (rec.priority || 'medium') as 'high' | 'medium' | 'low',
      }));
    }
  } catch {
    // Not JSON, try to parse from text format
  }

  // Fallback: parse from structured text
  const lines = aiResponse.split('\n');
  let currentRec: Partial<EmailRecommendation> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.match(/^\d+\./)) {
      // New recommendation
      if (currentRec && currentRec.title) {
        recommendations.push({
          category: currentRec.category || 'Safety',
          title: currentRec.title,
          description: currentRec.description || '',
          priority: (currentRec.priority || 'medium') as 'high' | 'medium' | 'low',
        });
      }
      currentRec = {
        title: trimmed.replace(/^\d+\.\s*/, ''),
        category: 'Safety',
        priority: 'medium',
      };
    } else if (trimmed.toLowerCase().startsWith('priority:')) {
      const priority = trimmed.split(':')[1]?.trim().toLowerCase();
      if (priority === 'high' || priority === 'medium' || priority === 'low') {
        if (currentRec) currentRec.priority = priority;
      }
    } else if (trimmed.toLowerCase().startsWith('category:')) {
      if (currentRec) currentRec.category = trimmed.split(':')[1]?.trim() || 'Safety';
    } else if (trimmed && currentRec && !currentRec.description) {
      currentRec.description = trimmed;
    } else if (trimmed && currentRec && currentRec.description) {
      currentRec.description += ' ' + trimmed;
    }
  }

  if (currentRec && currentRec.title) {
    recommendations.push({
      category: currentRec.category || 'Safety',
      title: currentRec.title,
      description: currentRec.description || '',
      priority: (currentRec.priority || 'medium') as 'high' | 'medium' | 'low',
    });
  }

  return recommendations;
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

    // Get custom system prompt from environment or use default
    // Note: Next.js doesn't handle multi-line env vars well, so we'll read from file if needed
    let customSystemPrompt = process.env.OPENAI_SYSTEM_PROMPT?.trim() || '';
    
    // If the prompt seems truncated (less than 100 chars), try reading from file
    // Next.js doesn't handle multi-line env vars well, so we read directly from file
    if (!customSystemPrompt || customSystemPrompt.length < 100) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Extract the full multi-line prompt - match from OPENAI_SYSTEM_PROMPT=" to the last " on its own line
        const lines = envContent.split('\n');
        let inPrompt = false;
        let promptLines: string[] = [];
        
        for (const line of lines) {
          if (line.startsWith('OPENAI_SYSTEM_PROMPT="')) {
            inPrompt = true;
            // Get everything after the opening quote
            const content = line.replace(/^OPENAI_SYSTEM_PROMPT="/, '');
            if (content && !content.endsWith('"')) {
              promptLines.push(content);
            } else if (content.endsWith('"')) {
              // Single line prompt
              promptLines.push(content.slice(0, -1));
              break;
            }
          } else if (inPrompt) {
            if (line === '"') {
              // End of prompt
              break;
            } else {
              promptLines.push(line);
            }
          }
        }
        
        if (promptLines.length > 0) {
          customSystemPrompt = promptLines.join('\n').trim();
        }
      } catch (err) {
        console.error('Error reading system prompt from file:', err);
      }
    }
    
    // Use default if still empty
    if (!customSystemPrompt) {
      customSystemPrompt = 'You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. Provide clear, actionable recommendations. Always return valid JSON.';
    }
    
    // Log for debugging (remove in production)
    if (process.env.OPENAI_SYSTEM_PROMPT || customSystemPrompt.length > 100) {
      console.log('Using custom system prompt (length:', customSystemPrompt.length, 'chars)');
    }

    // Get user prompt from environment (OPENAI_ANALYSIS_PROMPT)
    // This contains the task instructions and format requirements
    let userPrompt = process.env.OPENAI_ANALYSIS_PROMPT?.trim() || '';
    
    // If the prompt seems truncated, try reading from file
    if (!userPrompt || userPrompt.length < 100) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const lines = envContent.split('\n');
          let inPrompt = false;
          let promptLines: string[] = [];
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('OPENAI_ANALYSIS_PROMPT=')) {
              inPrompt = true;
              const afterEquals = line.substring(line.indexOf('=') + 1).trim();
              
              if (afterEquals.startsWith('"')) {
                const content = afterEquals.substring(1);
                if (content.endsWith('"') && content.length > 1) {
                  userPrompt = content.slice(0, -1).trim();
                  break;
                } else {
                  promptLines.push(content);
                }
              } else if (afterEquals.startsWith("'")) {
                const content = afterEquals.substring(1);
                if (content.endsWith("'") && content.length > 1) {
                  userPrompt = content.slice(0, -1).trim();
                  break;
                } else {
                  promptLines.push(content);
                }
              } else if (afterEquals) {
                userPrompt = afterEquals.trim();
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
            userPrompt = promptLines.join('\n').trim();
          }
        }
      } catch (err) {
        console.error('Error reading analysis prompt from file:', err);
      }
    }
    
    // Use default if still empty
    if (!userPrompt || userPrompt.length < 100) {
      console.log('⚠️  No OPENAI_ANALYSIS_PROMPT found, using default');
      userPrompt = `You are a safety compliance expert analyzing FMCSA (Federal Motor Carrier Safety Administration) data for a trucking company. 

Your task is to generate specific, actionable safety recommendations based on the carrier's safety profile. Focus on:
1. Compliance issues (MCS-150 form updates, regulatory requirements)
2. Safety violations (prioritize high-severity and out-of-service violations)
3. Operational improvements (driver management, vehicle maintenance, hours of service)
4. Risk reduction strategies

Return your recommendations as a JSON object with this structure:
{
  "recommendations": [
    {
      "category": "Compliance" | "Safety" | "Operations",
      "title": "Short recommendation title",
      "description": "Detailed description of the recommendation and why it matters",
      "priority": "high" | "medium" | "low",
      "explanation": "CITE SPECIFIC DATA SOURCES: Reference the exact data points that led to this recommendation"
    }
  ]
}

Prioritize recommendations based on:
- High: Critical safety issues, out-of-service violations, compliance deadlines, missing required data
- Medium: Important improvements that reduce risk, recurring violation patterns
- Low: Best practices and general safety enhancements

Generate 3-8 recommendations. Focus on the most impactful issues first.`;
    } else {
      console.log('✅ Using custom analysis prompt from .env (length:', userPrompt.length, 'chars)');
    }

    // Build the complete user prompt by appending dynamic content
    const filloutContext = filloutData?.operationalData
      ? `\n\nIMPORTANT: Use the operational context provided (ELD system, cameras, training programs, etc.) to tailor recommendations. For example:
- If they use a specific ELD system, reference it in HOS recommendations
- If they have dash cameras, incorporate that into unsafe driving recommendations
- If they have training programs, suggest leveraging them for specific areas
- Consider their current tools and processes when making recommendations`
      : '';

    const basePrompt = `${userPrompt}${filloutContext}

FMCSA Data:
${formattedData}`;

    // Append custom prompt if provided
    const prompt = customPrompt 
      ? `${basePrompt}\n\nAdditional Instructions:\n${customPrompt}`
      : basePrompt;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency, can be changed to gpt-4 for better quality
      messages: [
        {
          role: 'system',
          content: customSystemPrompt,
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
    let recommendations: EmailRecommendation[] = [];
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations;
      } else if (Array.isArray(parsed)) {
        recommendations = parsed;
      } else {
        // Fallback parsing
        recommendations = parseAIRecommendations(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI Response:', aiResponse);
      recommendations = parseAIRecommendations(aiResponse);
    }

    // Ensure all recommendations have required fields
    recommendations = recommendations
      .filter((rec) => rec.title && rec.description)
      .map((rec) => ({
        category: rec.category || 'Safety',
        title: rec.title,
        description: rec.description,
        priority: (rec.priority || 'medium') as 'high' | 'medium' | 'low',
        explanation: rec.explanation || undefined, // Include explanation if provided
      }));

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

