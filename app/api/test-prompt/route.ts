import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify OPENAI_SYSTEM_PROMPT is loaded correctly
 * This is for debugging only - remove in production
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  let systemPrompt = process.env.OPENAI_SYSTEM_PROMPT?.trim() || '';
  
  // If the prompt seems truncated, try reading from file (same logic as recommendations route)
  // Next.js doesn't handle multi-line env vars well, so we read directly from file
  if (!systemPrompt || systemPrompt.length < 100) {
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
        systemPrompt = promptLines.join('\n').trim();
      }
    } catch (err) {
      console.error('Error reading system prompt from file:', err);
    }
  }

  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    hasSystemPrompt: !!systemPrompt,
    systemPromptLength: systemPrompt?.length || 0,
    systemPromptPreview: systemPrompt 
      ? {
          first100: systemPrompt.substring(0, 100),
          last100: systemPrompt.substring(Math.max(0, systemPrompt.length - 100)),
        }
      : null,
    note: systemPrompt.length > 100 
      ? 'Full prompt loaded successfully from file' 
      : 'Prompt may be truncated - check .env.local format',
  });
}
