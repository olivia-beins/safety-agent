# AI Prompts Guide

The Safety Agent uses **two separate AI prompts** to allow you to iterate on analysis and email drafting independently.

## Two-Prompt System

### 1. Analysis Prompt (`OPENAI_SYSTEM_PROMPT`)
**Used for:** Generating initial safety recommendations from FMCSA data

**Location:** `/api/recommendations` endpoint

**Purpose:** Analyzes FMCSA data and violations to generate basic recommendations (title, description, priority, category)

**When to customize:** 
- Change how the AI analyzes safety data
- Adjust what types of recommendations are generated
- Modify the analysis approach or focus areas

### 2. Email Drafting Prompt (`OPENAI_EMAIL_PROMPT`)
**Used for:** Converting recommendations into strategic email format (observation/action/owner)

**Location:** `/api/recommendations/strategic` endpoint

**Purpose:** Takes basic recommendations and formats them into strategic recommendations suitable for email communication

**When to customize:**
- Change the tone or style of email communications
- Adjust how observations vs. actions are written
- Modify the consultative approach in emails
- Refine the professional voice for customer-facing content

## Setup

### 1. Add Both Prompts to `.env.local`

```env
# Analysis Prompt - for generating recommendations from data
OPENAI_SYSTEM_PROMPT="You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. Provide clear, actionable recommendations. Always return valid JSON."

# Email Drafting Prompt - for writing strategic recommendations in emails
OPENAI_EMAIL_PROMPT="You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. You have deep expertise in:
- FMCSA compliance requirements and regulations
- Safety management systems and best practices
- Risk assessment and mitigation strategies
- Insurance industry standards for commercial motor carriers

When drafting strategic recommendations for emails, you:
- Write in a professional, consultative tone suitable for email communication
- Create clear, distinct observations (what you found) and actions (what to do)
- Assign appropriate owners (Safety Manager, Operations Manager, etc.)
- Focus on helping carriers improve their safety rating and reduce insurance premiums
- Make recommendations specific, actionable, and prioritized by risk and impact"
```

### 2. Multi-Line Prompts

For multi-line prompts in `.env.local`, you can write them across multiple lines:

```env
OPENAI_SYSTEM_PROMPT="You are a professional safety compliance consultant.
Your role is to analyze FMCSA data and generate recommendations.
Focus on compliance, safety, and operational improvements."

OPENAI_EMAIL_PROMPT="You are a professional safety compliance consultant.
When writing emails, use a consultative tone.
Make observations distinct from actions.
Assign clear ownership to recommendations."
```

The system will automatically read multi-line prompts from the `.env.local` file.

## Default Prompts

If you don't set custom prompts, the system uses these defaults:

### Default Analysis Prompt
- Focuses on analyzing FMCSA data
- Generates basic recommendations
- Returns JSON format

### Default Email Drafting Prompt
- Professional, consultative tone
- Creates distinct observations and actions
- Assigns appropriate owners
- Focuses on safety rating improvement

## Iteration Workflow

### To Iterate on Analysis:
1. Edit `OPENAI_SYSTEM_PROMPT` in `.env.local`
2. Restart the dev server (or it will auto-reload)
3. Test with a Fillout submission
4. Review the recommendations generated
5. Adjust the prompt and repeat

### To Iterate on Email Drafting:
1. Edit `OPENAI_EMAIL_PROMPT` in `.env.local`
2. Restart the dev server (or it will auto-reload)
3. Test with a Fillout submission
4. Review the email output (observation/action/owner format)
5. Adjust the prompt and repeat

## Tips for Effective Prompts

### Analysis Prompt Tips:
- Be specific about what to analyze (violations, compliance, operations)
- Define the output format clearly
- Specify priority levels and categories
- Include examples if helpful

### Email Drafting Prompt Tips:
- Define the tone (consultative, professional, friendly)
- Emphasize the distinction between observation and action
- Specify who should be assigned as owners
- Include guidance on length and detail level

## Example: Different Personas

You can use different personas for each prompt:

### Analysis Prompt (Data-Focused)
```env
OPENAI_SYSTEM_PROMPT="You are a data analyst specializing in FMCSA safety metrics. Analyze the data objectively and identify patterns, trends, and compliance gaps. Be precise and data-driven."
```

### Email Drafting Prompt (Customer-Facing)
```env
OPENAI_EMAIL_PROMPT="You are a trusted safety advisor writing to a fleet manager. Use a supportive, consultative tone. Help them understand the issues and guide them toward solutions. Be encouraging but clear about priorities."
```

## Troubleshooting

**Prompt not working?**
- Check that the prompt is in `.env.local` (not `.env`)
- Restart the dev server after changing prompts
- Check the console for errors reading the prompt

**Multi-line prompt truncated?**
- Make sure the prompt starts with `OPENAI_SYSTEM_PROMPT="` or `OPENAI_EMAIL_PROMPT="`
- End with a closing `"` on its own line
- The system will read everything between the quotes

**Want to test without AI?**
- Leave the prompts unset or use the default prompts
- The system will still work with rule-based recommendations as fallback

