# AI-Powered Recommendations Guide

The Safety Agent now supports AI-generated strategic recommendations (observation/action/owner format) instead of hard-coded mappings. This makes recommendations more contextual, flexible, and easier to customize.

## How It Works

### Architecture

1. **Rule-Based Recommendations** (`generateRecommendations`): Generates basic recommendations based on FMCSA data
2. **AI Strategic Recommendations** (`/api/recommendations/strategic`): Converts recommendations into strategic format (observation/action/owner) using AI
3. **Fallback**: If AI fails or isn't available, falls back to rule-based mapping

### Flow

```
FMCSA Data → Rule-Based Recommendations → AI Strategic Format → Email
                                         ↓ (if AI fails)
                                    Rule-Based Mapping
```

## Setup

### 1. Add OpenAI API Key

Add to `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. (Optional) Customize System Prompt

The system prompt defines the AI's persona and expertise. Add to `.env.local`:

```env
OPENAI_SYSTEM_PROMPT="You are a professional safety compliance consultant specializing in FMCSA regulations and trucking safety. You have deep expertise in:
- FMCSA compliance requirements and regulations
- Safety management systems and best practices
- Risk assessment and mitigation strategies
- Insurance industry standards for commercial motor carriers

Your recommendations are always:
- Specific and actionable
- Based on actual data and violations
- Prioritized by risk and impact
- Written in a professional, consultative tone
- Focused on helping carriers improve their safety rating and reduce insurance premiums"
```

**Note**: For multi-line prompts in `.env.local`, you can write them across multiple lines. The system will read them correctly.

### 3. (Optional) Choose Model

Default is `gpt-4o-mini` (cost-effective). To use a different model:

```env
OPENAI_MODEL=gpt-4o
```

## Usage

### In the UI

When you toggle "Use AI-Generated Recommendations", the system will:
1. Generate rule-based recommendations
2. Send them to the AI to create strategic format (observation/action/owner)
3. Use AI-generated content in the email

### Programmatically

```typescript
import { generateSafetyEmail } from '@/lib/services/email-template';

const email = await generateSafetyEmail({
  companyName: 'ABC Trucking',
  fmcsaData: fmcsaData,
  recommendations: recommendations,
  useAI: true, // Enable AI-powered strategic recommendations
});
```

## Benefits of AI Approach

### 1. **Contextual Recommendations**
- AI analyzes all violations together
- Creates recommendations that address multiple issues
- Considers relationships between different violation types

### 2. **Dynamic Content**
- Observation and action are always distinct
- Content adapts to specific violation patterns
- More natural, consultative language

### 3. **Easy Customization**
- Change persona via system prompt
- No code changes needed
- Can adjust tone, expertise level, focus areas

### 4. **Better Violation Analysis**
- AI can identify patterns across violations
- Suggests specific components (brake systems, lights, etc.) based on violation codes
- More accurate owner assignments

## Example Output

### Rule-Based (Hard-Coded)
```
Observation: You have 5 vehicle maintenance violation(s) on record, with issues related to brake systems and other critical components.
Action: Develop and implement a proactive vehicle maintenance schedule that includes routine inspections specifically targeting brake systems and other critical components.
```

### AI-Generated
```
Observation: Your FMCSA profile shows 5 vehicle maintenance violations in the past 6 months, with 3 violations specifically related to brake system defects (codes 39375a3, 393207c). Two of these resulted in out-of-service orders, indicating critical safety concerns that require immediate attention.
Action: Implement a comprehensive brake inspection protocol that includes: (1) Pre-trip brake system checks by drivers, (2) Monthly professional brake inspections by certified mechanics, (3) Documentation of all brake maintenance in a centralized system, and (4) Driver training on brake system warning signs. Establish a preventive maintenance schedule targeting brake components every 10,000 miles or quarterly, whichever comes first.
```

## Customizing the Persona

You can customize the AI's persona by modifying the system prompt. Examples:

### Insurance-Focused Persona
```
You are an insurance risk analyst specializing in commercial motor carrier safety. Your recommendations focus on reducing insurance premiums and improving loss ratios. You speak in terms of risk reduction and cost savings.
```

### Compliance-Focused Persona
```
You are an FMCSA compliance expert. Your recommendations prioritize regulatory compliance and avoiding violations. You reference specific FMCSA regulations and requirements.
```

### Operations-Focused Persona
```
You are a fleet operations consultant. Your recommendations focus on operational efficiency, driver retention, and cost-effective safety improvements. You understand the day-to-day challenges of running a trucking operation.
```

## Troubleshooting

### AI Not Generating Recommendations

1. **Check API Key**: Ensure `OPENAI_API_KEY` is set in `.env.local`
2. **Check Console**: Look for errors in browser console or server logs
3. **Fallback**: System automatically falls back to rule-based if AI fails

### Recommendations Seem Generic

1. **Improve System Prompt**: Add more specific expertise areas
2. **Use Better Model**: Switch to `gpt-4o` for more nuanced responses
3. **Add Custom Prompt**: Pass additional context via `customPrompt` parameter

### Observation and Action Still the Same

This shouldn't happen with AI, but if it does:
1. Check the AI response in server logs
2. The prompt explicitly instructs AI to make them different
3. Fallback to rule-based should handle this correctly

## Cost Considerations

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens

For typical usage (analyzing one carrier's data):
- gpt-4o-mini: ~$0.001-0.002 per request
- gpt-4o: ~$0.01-0.02 per request

## Best Practices

1. **Start with gpt-4o-mini**: It's cost-effective and produces good results
2. **Customize the system prompt**: Make it match your brand voice and expertise
3. **Test with real data**: Try different violation patterns to see how AI responds
4. **Monitor costs**: Check OpenAI usage dashboard regularly
5. **Keep fallback**: Always have rule-based as backup

## Future Enhancements

Potential improvements:
- Fine-tuned model on your specific recommendations
- Multi-step reasoning for complex violation patterns
- Integration with violation code databases for more specific recommendations
- A/B testing different personas
- Learning from user feedback on recommendations

