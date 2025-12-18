// Email Types
export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface EmailRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  explanation?: string; // Optional explanation citing data sources and reasoning
}

