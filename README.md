# Safety Agent - Recommendations Engine Test

A simplified Next.js application for testing the safety recommendations engine with mock FMCSA data.

## Overview

This application provides a minimal testing environment for the recommendations engine. It uses mock FMCSA data scenarios to generate safety recommendations without requiring any external API integrations or database connections.

## Features

- **Mock Data Scenarios**: 9 pre-configured test scenarios covering various FMCSA data situations
- **Recommendations Engine**: Generates safety recommendations based on FMCSA data
  - **Rule-Based**: Traditional rule-based recommendations (default, no API key required)
  - **AI-Powered**: OpenAI-generated recommendations (optional, requires API key)
- **Email Formatting**: Formats recommendations into professional email output
- **Simple UI**: Clean interface to select scenarios and view generated recommendations

## Prerequisites

- Node.js 18+ and npm
- (Optional) OpenAI API key for AI-generated recommendations

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure OpenAI (Optional):**

If you want to use AI-generated recommendations, create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom system prompt for OpenAI
# This sets the system message that defines the AI's role and behavior
# OPENAI_SYSTEM_PROMPT=You are a professional safety compliance consultant...
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).

**Note:** The application works without an OpenAI API key using rule-based recommendations. The AI feature is optional.

**Custom Prompts:**
- **System Prompt**: Set `OPENAI_SYSTEM_PROMPT` in `.env.local` to customize the AI's role and behavior (applies to all requests)
- **Per-Request Prompt**: Use the "Custom Prompt" textarea in the UI to add additional instructions for specific requests

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Choose recommendation mode** (optional):
   - Toggle "Use AI-Generated Recommendations" to enable OpenAI-powered recommendations
   - Leave unchecked to use rule-based recommendations (default)
   - If using AI, you can add a custom prompt in the textarea to guide the AI's recommendations (e.g., "Focus on cost-effective solutions" or "Emphasize driver training")

2. **Select a test scenario** from the grid of available scenarios

3. **View the results**:
   - **Email Output** tab: See the formatted email with recommendations
   - **Raw Recommendations** tab: See the structured recommendations list

4. **Review the generated recommendations** organized by priority (high, medium, low)

## Available Test Scenarios

- **Clean Record**: No violations, recent MCS-150 form
- **High Severity Violations**: Recent high-severity violations
- **Old MCS-150 Form**: Outdated form (over 2 years old)
- **Hazmat Carrier**: Carrier transporting hazardous materials
- **Missing Driver/Vehicle Info**: Missing driver and vehicle information
- **Multiple Violation Types**: Various violation types (HOS, Vehicle Maintenance, Driver Fitness)
- **Passenger Carrier**: Passenger carrier requiring enhanced safety protocols
- **High Mileage Operations**: Carrier with very high annual mileage
- **Small Fleet**: Small fleet (less than 5 drivers)

## Project Structure

```
safety-agent/
├── app/
│   ├── components/
│   │   ├── FMCSADataDisplay.tsx      # Displays FMCSA data
│   │   └── RecommendationsDisplay.tsx # Displays recommendations
│   └── page.tsx                       # Main page with scenario selection
├── app/
│   ├── api/
│   │   └── recommendations/
│   │       └── route.ts               # OpenAI API endpoint
│   └── ...
├── lib/
│   ├── data/
│   │   └── mock-fmcsa-data.ts         # Mock test scenarios
│   ├── services/
│   │   ├── recommendations.ts         # Recommendations engine (rule-based & AI)
│   │   └── email-template.ts          # Email formatting service
│   └── types/
│       ├── email.ts                   # Email type definitions
│       └── fmcsa.ts                   # FMCSA type definitions
└── README.md
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Adding New Test Scenarios

To add new test scenarios, edit `lib/data/mock-fmcsa-data.ts` and add a new entry to the `mockScenarios` array. Each scenario should include:
- A descriptive name
- A description
- A complete `FMCSARecord` object with the data to test

## License

MIT
