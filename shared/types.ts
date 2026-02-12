// Shared Types for Agent402

export interface PaymentHeaders {
  'x-payment-required': string;
  'x-payment-amount': string;
  'x-payment-address': string;
  'x-payment-memo': string;
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface Citation {
  authors: string;
  title: string;
  year: number;
  venue: string;
  doi?: string;
}

export interface ResearchReport {
  topic: string;
  summary: string;
  sources: ResearchResult[];
  citations: Citation[];
  costBreakdown: {
    [key: string]: number;
  };
  totalCost: number;
  timestamp: string;
}

export interface PaymentProof {
  txId: string;
  endpoint: string;
  expiresAt: number;
}
