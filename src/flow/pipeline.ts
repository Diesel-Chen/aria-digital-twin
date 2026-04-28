import { parseInquiry } from "../prompts/parse-inquiry";
import { matchProducts } from "../prompts/match-products";
import { draftReply } from "../prompts/draft-reply";
import type {
  Customer,
  Inquiry,
  InquiryEvent,
  Product,
  RouteDecision,
} from "../types";

export async function processInquiry(
  inquiry: Inquiry,
  products: Product[],
  customers: Customer[],
): Promise<InquiryEvent> {
  const start = Date.now();
  const customer = customers.find((c) => c.id === inquiry.customerId) ?? null;
  const llmVia: ("live" | "mock")[] = [];

  const parsed = await parseInquiry(inquiry);
  llmVia.push(parsed.via);

  if (!parsed.value.isBusiness) {
    return {
      inquiryId: inquiry.id,
      customerId: inquiry.customerId,
      receivedAt: inquiry.receivedAt,
      processedAt: new Date().toISOString(),
      language: inquiry.language,
      isBusiness: false,
      parsed: parsed.value,
      matches: [],
      draft: null,
      route: "non_business",
      routeReason: parsed.value.rejectReason || "非业务询盘，已过滤",
      llmVia,
      durationMs: Date.now() - start,
      isBlindSpotHour: isBlindSpot(inquiry.receivedAt),
    };
  }

  const matchResult = await matchProducts(parsed.value, products, customer);
  llmVia.push(matchResult.via);

  const draftResult = await draftReply(
    inquiry,
    parsed.value,
    matchResult.value,
    products,
    customer,
  );
  llmVia.push(draftResult.via);

  const { decision, reason } = decideRoute(
    parsed.value,
    matchResult.value,
    customer,
  );

  return {
    inquiryId: inquiry.id,
    customerId: inquiry.customerId,
    receivedAt: inquiry.receivedAt,
    processedAt: new Date().toISOString(),
    language: inquiry.language,
    isBusiness: true,
    parsed: parsed.value,
    matches: matchResult.value,
    draft: draftResult.value,
    route: decision,
    routeReason: reason,
    llmVia,
    durationMs: Date.now() - start,
    isBlindSpotHour: isBlindSpot(inquiry.receivedAt),
  };
}

function decideRoute(
  parsed: { inferredUrgency: "low" | "normal" | "high"; buyerSentiment: string; certificationsNeeded: string[] },
  matches: { confidence: number }[],
  customer: Customer | null,
): { decision: RouteDecision; reason: string } {
  const top = matches[0]?.confidence ?? 0;

  if (parsed.buyerSentiment === "frustrated") {
    return {
      decision: "human",
      reason: "客户已表现不耐烦/催单，必须真人接管以稳住关系",
    };
  }
  if (parsed.certificationsNeeded.length > 0 && customer?.tier !== "A") {
    return {
      decision: "review",
      reason: `涉及认证 (${parsed.certificationsNeeded.join("/")})，非 A 级客户首单，先送审`,
    };
  }
  if (top >= 0.85 && parsed.inferredUrgency !== "high") {
    return {
      decision: "auto_send",
      reason: `Top SKU 置信度 ${top.toFixed(2)} ≥ 0.85，紧急度可控，自动发送`,
    };
  }
  if (top >= 0.85 && parsed.inferredUrgency === "high" && customer?.tier === "A") {
    return {
      decision: "auto_send",
      reason: `A 级客户高紧急询盘，匹配置信度 ${top.toFixed(2)}，立即自动响应锁住客户`,
    };
  }
  if (top >= 0.6) {
    return {
      decision: "review",
      reason: `匹配置信度 ${top.toFixed(2)}，业务员快速过审后即可发出`,
    };
  }
  return {
    decision: "human",
    reason: `候选 SKU 置信度均 < 0.6，需人工补充选品`,
  };
}

export function isBlindSpot(iso: string): boolean {
  const d = new Date(iso);
  const cnHour = (d.getUTCHours() + 8) % 24;
  return cnHour >= 21 || cnHour < 9;
}
