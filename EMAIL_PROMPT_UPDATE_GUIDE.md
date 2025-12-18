# Email Prompt Update Guide

## Issue
The AI was including format labels like `[Recommendation Title 1 - leverage ELD system]` instead of just `leverage ELD system`.

## Solution
Update your `OPENAI_EMAIL_PROMPT` in `.env.local` to clarify that brackets are placeholders.

## What to Change

**Before (causes the issue):**
```
[Recommendation Title 1 - Addressed to Highest Priority Item]
Observation: [Reference specific data point]
Action: [Insert specific expert strategy]
```

**After (fixed version):**
```
For each recommendation, write:
- Title: Write the actual recommendation title directly (e.g., "Leverage ELD System for HOS Compliance"). Do NOT include brackets, numbering, or format labels like "[Recommendation Title 1]".
- Observation: Reference the specific data point (e.g., "Maintenance Score is 82%")
- Action: Insert the specific expert strategy
- Example: Provide a concrete detail on how to do it
- Owner: Assign to a role (e.g., Maintenance Manager, Safety Director)
```

## Key Changes
1. **Remove bracket placeholders** - Instead of `[Recommendation Title 1]`, just say "Title:"
2. **Add explicit instruction** - "Do NOT include brackets, numbering, or format labels"
3. **Use clear labels** - Use "Title:", "Observation:", "Action:" instead of brackets

## Example Updated Section

Replace this:
```
[Recommendation Title 1 - Addressed to Highest Priority Item]
Observation: [Reference specific data point, e.g. "Maintenance Score is 82%"].
Action: [Insert specific expert strategy from Section 2].
Example: [Provide a concrete detail on how to do it].
Owner: [Assign to a role, e.g., Maintenance Manager, Safety Director, Dispatch].
```

With this:
```
For each recommendation, format as follows:
Title: Write the recommendation title directly without brackets or numbering (e.g., "Establish Proactive Vehicle Maintenance Schedule")
Observation: Reference the specific data point (e.g., "Your Maintenance Score is 82%")
Action: Provide the specific expert strategy
Example: Include a concrete detail on how to implement it
Owner: Assign to the appropriate role (e.g., Maintenance Manager, Safety Director, Dispatch)
```

## Note
The code now also includes post-processing to automatically clean up any brackets that slip through, but updating your prompt is the best solution.

