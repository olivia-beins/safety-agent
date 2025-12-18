# Prompt Setup Guide

All prompts are now controlled via environment variables in `.env.local`. This allows you to easily iterate on prompts without changing code.

## Environment Variables

### 1. `OPENAI_SYSTEM_PROMPT`
**Purpose**: Sets the AI's persona and role (system message)

**Example**:
```env
OPENAI_SYSTEM_PROMPT="
You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. 
You have deep expertise in compliance requirements, safety management systems, and risk assessment.
Always return valid JSON.
"
```

### 2. `OPENAI_ANALYSIS_PROMPT` (NEW)
**Purpose**: Contains the task instructions and format requirements (user message)

**What to include**:
- Task description (what the AI should do)
- JSON structure requirements
- Explanation field requirements (how to cite data sources)
- Priority guidelines
- Any other analysis instructions

**Example**:
```env
OPENAI_ANALYSIS_PROMPT="
You are a safety compliance expert analyzing FMCSA data for a trucking company.

Your task is to generate specific, actionable safety recommendations based on the carrier's safety profile. Focus on:
1. Compliance issues (MCS-150 form updates, regulatory requirements)
2. Safety violations (prioritize high-severity and out-of-service violations)
3. Operational improvements (driver management, vehicle maintenance, hours of service)
4. Risk reduction strategies

Return your recommendations as a JSON object with this structure:
{
  \"recommendations\": [
    {
      \"category\": \"Compliance\" | \"Safety\" | \"Operations\",
      \"title\": \"Short recommendation title\",
      \"description\": \"Detailed description of the recommendation and why it matters\",
      \"priority\": \"high\" | \"medium\" | \"low\",
      \"explanation\": \"CITE SPECIFIC DATA SOURCES: Reference the exact data points that led to this recommendation. For example: 'Found in FMCSA data: MCS-150 form date is 2020-01-15 (over 2 years old)' or 'Found 3 high-severity Vehicle Maintenance violations from inspections on 2024-03-15, 2024-05-22, and 2024-07-10'. Always cite WHERE you found the data (FMCSA data, Fillout form, etc.) and WHAT specific values led to the recommendation.\"
    }
  ]
}

Prioritize recommendations based on:
- High: Critical safety issues, out-of-service violations, compliance deadlines, missing required data
- Medium: Important improvements that reduce risk, recurring violation patterns
- Low: Best practices and general safety enhancements

CRITICAL: For the \"explanation\" field, you MUST cite the specific data source and exact values that led to the recommendation. Examples:
- ✅ GOOD: \"Found in FMCSA data: MCS-150 form date is 2020-01-15 (over 2 years old, should be updated every 2 years)\"
- ✅ GOOD: \"Found 3 high-severity Vehicle Maintenance violations from inspections on 2024-03-15, 2024-05-22, and 2024-07-10\"
- ❌ BAD: \"An outdated MCS-150 can lead to compliance issues\" (too generic, doesn't cite data)

Always specify WHERE the data came from (FMCSA data, Fillout form, etc.) and WHAT specific values/records led to the recommendation.

Generate 3-8 recommendations. Focus on the most impactful issues first.
"
```

### 3. `OPENAI_EMAIL_PROMPT`
**Purpose**: Used for generating the final email (system message for email generation)

**Location**: Used in `/api/email/generate` endpoint

## How It Works

1. **System Prompt** (`OPENAI_SYSTEM_PROMPT`): Sets who the AI is
2. **Analysis Prompt** (`OPENAI_ANALYSIS_PROMPT`): Tells the AI what to do and how to format the output
3. **Email Prompt** (`OPENAI_EMAIL_PROMPT`): Used when generating the final email

## Dynamic Content

The system automatically appends:
- Fillout operational context (if available)
- FMCSA data (formatted)

You don't need to include these in your prompts - they're added automatically.

## Formatting Tips

- Use multi-line strings with quotes: `OPENAI_ANALYSIS_PROMPT="..."`
- End with a closing quote on its own line: `"`
- Escape internal quotes: `\"`
- The system reads from `.env.local` file directly to handle multi-line prompts

## Testing

After updating prompts:
1. Save `.env.local`
2. Restart the dev server (or it will auto-reload)
3. Test with a Fillout submission
4. Check the console logs to verify your prompt was loaded

