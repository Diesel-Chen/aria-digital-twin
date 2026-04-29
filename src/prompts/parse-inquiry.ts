import { z } from "zod";
import { ariaGenerateObject } from "../llm";
import type { Inquiry, InquiryParsed } from "../types";

const ParseSchema = z.object({
  isBusiness: z.boolean(),
  rejectReason: z.string().optional(),
  intentSummary: z.string().optional().default(""),
  productCategory: z
    .enum(["bearing", "valve", "fastener", "hydraulic", "mixed", "unknown"])
    .optional()
    .default("unknown"),
  keywords: z.array(z.string()).optional().default([]),
  detectedSpecs: z.record(z.union([z.string(), z.number()])).optional().default({}),
  quantity: z.union([z.number(), z.string()]).optional(),
  destinationPort: z.string().optional(),
  inferredUrgency: z
    .enum(["low", "normal", "high"])
    .optional()
    .default("normal"),
  certificationsNeeded: z.array(z.string()).optional().default([]),
  buyerSentiment: z
    .enum(["neutral", "positive", "frustrated"])
    .optional()
    .default("neutral"),
});

const SYSTEM = `你是 Aria，跨境 B2B 询盘解析专家。从外贸询盘原文中抽取结构化字段，严格按照给定的 JSON Schema 输出（字段名使用 camelCase）。
要求：
1. 严格判断是否为真实业务询盘（isBusiness）。投资邀约、招聘、垃圾邮件 → false 并给出 rejectReason。
2. productCategory 识别产品类别：bearing / valve / fastener / hydraulic / mixed / unknown。
3. keywords 抽取规格关键字（型号、尺寸、压力、材质等）。
4. detectedSpecs 抽取已写明的规格细节，对象的 key/value 都是字符串。
5. quantity 数量；destinationPort 目的港；certificationsNeeded 所需认证。
6. inferredUrgency：明确催单、产线停机、ASAP → high；首次询盘、常规 → normal；只是询价单 → low。
7. buyerSentiment：礼貌正常 → neutral；明确催 / 多次未回 / 抱怨 → frustrated。
所有字段必须返回，不存在的可选字段（rejectReason / quantity / destinationPort）可以省略，但枚举类、数组类必须填。`;

export async function parseInquiry(inquiry: Inquiry) {
  const result = await ariaGenerateObject<z.infer<typeof ParseSchema>>({
    schema: ParseSchema,
    system: SYSTEM,
    prompt: `询盘原文：\n主题：${inquiry.subject}\n正文：\n${inquiry.body}`,
    fallback: () => deterministicParse(inquiry),
  });
  return { value: normalizeParsed(result.value, inquiry), via: result.via };
}

function normalizeParsed(
  raw: z.infer<typeof ParseSchema>,
  inquiry: Inquiry,
): InquiryParsed {
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.detectedSpecs ?? {})) {
    specs[k] = String(v);
  }
  let quantity: number | undefined;
  if (typeof raw.quantity === "number") quantity = raw.quantity;
  else if (typeof raw.quantity === "string") {
    const m = raw.quantity.match(/\d[\d,]*/);
    if (m) quantity = Number.parseInt(m[0].replace(/,/g, ""), 10);
  }
  return {
    isBusiness: raw.isBusiness,
    rejectReason: raw.rejectReason,
    intentSummary:
      raw.intentSummary || `${inquiry.fromCompany} 询盘 (${inquiry.subject})`,
    productCategory: raw.productCategory,
    keywords: raw.keywords,
    detectedSpecs: specs,
    quantity,
    destinationPort: raw.destinationPort,
    inferredUrgency: raw.inferredUrgency,
    certificationsNeeded: raw.certificationsNeeded,
    buyerSentiment: raw.buyerSentiment,
  };
}

function deterministicParse(inquiry: Inquiry): InquiryParsed {
  const text = `${inquiry.subject} ${inquiry.body}`.toLowerCase();
  const isBusiness = !/invest|investor|partnership|collab|funding|startup/.test(text);
  if (!isBusiness) {
    return {
      isBusiness: false,
      rejectReason: "投资邀约/合作请求，非外贸采购询盘",
      intentSummary: "Non-business outreach",
      productCategory: "unknown",
      keywords: [],
      detectedSpecs: {},
      inferredUrgency: "low",
      certificationsNeeded: [],
      buyerSentiment: "neutral",
    };
  }

  const categoryHits = {
    bearing: /bearing|подшипник|rodamiento|6205|6206|7208|22210|nu308|30206|ucp/.test(text),
    valve: /valve|кран|válvula|valvula|ball valve|gate valve|check valve|butterfly|bv-|gv-|chv-|bfv-/.test(text),
    fastener: /bolt|nut|washer|screw|tornillo|tuerca|болт|гайка|m8|m10|m12|m16|hdg|grade 8\.8|grade 10\.9/.test(text),
    hydraulic: /hydraulic|hidráulic|hidraulic|гидравлич|cylinder|cilindro|шланг|hose|piston|pump|solenoid|4we6/.test(text),
  };
  const hitList = Object.entries(categoryHits).filter(([, v]) => v).map(([k]) => k);
  const productCategory =
    hitList.length === 0 ? "unknown" : hitList.length > 1 ? "mixed" : (hitList[0] as "bearing" | "valve" | "fastener" | "hydraulic");

  const keywords: string[] = [];
  const skuMatches = inquiry.body.match(/\b(?:[A-Z]{2,}-)?\d{3,}(?:-[A-Z0-9]+)?\b/g) ?? [];
  keywords.push(...skuMatches.slice(0, 6));
  const sizeMatches = inquiry.body.match(/(?:DN|M)\d+(?:x\d+)?/gi) ?? [];
  keywords.push(...sizeMatches.slice(0, 6));

  const detectedSpecs: Record<string, string> = {};
  const bore = inquiry.body.match(/bore[:\s]+(\d+)\s*mm|diámetro[^:]*:\s*(\d+)\s*mm|внутренн[^:]*:\s*(\d+)\s*мм/i);
  if (bore) detectedSpecs.bore = (bore[1] || bore[2] || bore[3]) + "mm";
  const stroke = inquiry.body.match(/stroke[:\s]+(\d+)\s*mm|carrera[:\s]+(\d+)\s*mm/i);
  if (stroke) detectedSpecs.stroke = (stroke[1] || stroke[2]) + "mm";
  const pressure = inquiry.body.match(/(\d+(?:\.\d+)?)\s*MPa|PN(\d+)/i);
  if (pressure) detectedSpecs.pressure = pressure[1] ? pressure[1] + "MPa" : "PN" + pressure[2];
  const grade = inquiry.body.match(/grade\s+(\d+\.\d+)|grado\s+(\d+\.\d+)/i);
  if (grade) detectedSpecs.grade = grade[1] || grade[2];

  const qtyMatch = inquiry.body.match(/(\d{2,7})\s*(?:pcs|pieces|piezas|штук|шт)/i) ||
    inquiry.body.match(/(?:quantity|cantidad|количество)[:\s]+(\d+)/i);
  const quantity = qtyMatch ? Number.parseInt(qtyMatch[1], 10) : undefined;

  const portHit = inquiry.body.match(
    /(Chicago|Mumbai|Veracruz|Санкт-Петербург|Karachi|Tianjin|Melbourne|Valencia|Saudi Arabia)/i,
  );
  const destinationPort = portHit ? portHit[1] : undefined;

  const certifications: string[] = [];
  if (/gost|ГОСТ/i.test(text)) certifications.push("GOST");
  if (/\bce\b|en15048/i.test(text)) certifications.push("CE");
  if (/rohs/i.test(text)) certifications.push("RoHS");
  if (/api 6d|api6d/i.test(text)) certifications.push("API 6D");
  if (/iso p[56]/i.test(text)) certifications.push("ISO P5/P6");

  const isHigh = inquiry.urgencyHint === "high" ||
    /urgent|asap|line stops|stops on|cierra|закрывается|seguimiento|follow-up|did not receive/i.test(text);
  const isLow = !isHigh && (inquiry.urgencyHint === "low" || /price list|прайс/i.test(text));
  const inferredUrgency = isHigh ? "high" : isLow ? "low" : "normal";

  const frustrated = /did not receive|no he recibido|seguimiento|follow-up.*last week|line stops/i.test(text);
  const buyerSentiment: "neutral" | "positive" | "frustrated" = frustrated ? "frustrated" : "neutral";

  const intentSummary =
    productCategory === "unknown"
      ? `${inquiry.fromCompany} 询盘（类别待识别）`
      : `${inquiry.fromCompany} 寻购 ${productCategory}${quantity ? `，约 ${quantity} 件` : ""}${destinationPort ? `，目的港 ${destinationPort}` : ""}`;

  return {
    isBusiness: true,
    intentSummary,
    productCategory,
    keywords: [...new Set(keywords)],
    detectedSpecs,
    quantity,
    destinationPort,
    inferredUrgency,
    certificationsNeeded: certifications,
    buyerSentiment,
  };
}
