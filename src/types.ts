export interface Inquiry {
  id: string;
  fromEmail: string;
  fromCompany: string;
  customerId: string | null;
  subject: string;
  body: string;
  language: "en" | "es" | "ru";
  receivedAt: string;
  urgencyHint: "low" | "normal" | "high";
}

export interface Product {
  sku: string;
  nameZh: string;
  nameEn: string;
  category: "bearing" | "valve" | "fastener" | "hydraulic";
  specs: Record<string, string>;
  unitPrice: number;
  currency: string;
  moq: number;
  leadTime: string;
  stock: number;
}

export interface Customer {
  id: string;
  companyName: string;
  country: string;
  industry: string;
  scale: "small" | "mid" | "large";
  tier: "A" | "B" | "C";
  historicalSKUs: string[];
  preferredCurrency: string;
  annualPurchaseUSD: number;
  notes: string;
}

export interface InquiryParsed {
  isBusiness: boolean;
  rejectReason?: string;
  intentSummary: string;
  productCategory: "bearing" | "valve" | "fastener" | "hydraulic" | "mixed" | "unknown";
  keywords: string[];
  detectedSpecs: Record<string, string>;
  quantity?: number;
  destinationPort?: string;
  inferredUrgency: "low" | "normal" | "high";
  certificationsNeeded: string[];
  buyerSentiment: "neutral" | "positive" | "frustrated";
}

export interface MatchedProduct {
  sku: string;
  confidence: number;
  reason: string;
  tag: "exact" | "alternate" | "upgrade";
}

export interface DraftReply {
  language: "en" | "es" | "ru";
  subject: string;
  body: string;
}

export type RouteDecision = "auto_send" | "review" | "human";

export interface InquiryEvent {
  inquiryId: string;
  customerId: string | null;
  receivedAt: string;
  processedAt: string;
  language: "en" | "es" | "ru";
  isBusiness: boolean;
  parsed: InquiryParsed | null;
  matches: MatchedProduct[];
  draft: DraftReply | null;
  route: RouteDecision | "non_business";
  routeReason: string;
  llmVia: ("live" | "mock")[];
  durationMs: number;
  isBlindSpotHour: boolean;
  customerReply?: { repliedAt: string; body: string };
  followUp?: { sentAt: string; subject: string; body: string };
  revision?: {
    editedAt: string;
    editor: string;
    diffPercent: number;
    summary: string;
  };
}
