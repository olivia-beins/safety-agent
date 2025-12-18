import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify OPENAI_EMAIL_PROMPT is loaded correctly
 * This is for debugging only - remove in production
 * GET /api/test-email-prompt
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  // Always read from file first, as Next.js doesn't handle multi-line env vars well
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
        }
      }
    } catch (err) {
      console.error('Error reading email prompt from file:', err);
    }
  }
  
  // Fallback to env var if file reading didn't work
  if (!emailPrompt || emailPrompt.length < 100) {
    emailPrompt = process.env.OPENAI_EMAIL_PROMPT?.trim() || '';
  }

  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    hasEmailPrompt: !!emailPrompt,
    emailPromptLength: emailPrompt?.length || 0,
    emailPromptPreview: emailPrompt 
      ? {
          first200: emailPrompt.substring(0, 200),
          last200: emailPrompt.substring(Math.max(0, emailPrompt.length - 200)),
        }
      : null,
    fullPrompt: emailPrompt || null,
    note: emailPrompt && emailPrompt.length > 100 
      ? 'Full prompt loaded successfully from file' 
      : 'Prompt may be truncated or not found - check .env.local format',
    envVarValue: process.env.OPENAI_EMAIL_PROMPT?.substring(0, 100) || 'Not set',
  });
}
