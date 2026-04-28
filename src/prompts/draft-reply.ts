import { ariaGenerateText } from "../llm";
import type { Customer, DraftReply, Inquiry, InquiryParsed, MatchedProduct, Product } from "../types";

const SYSTEM = `你是 Aria，外贸资深业务员的数字分身。基于询盘解析和候选 SKU，写一封专业、简洁、不冒失的初响邮件草稿。
风格要求：
- 用询盘语言回复（en / es / ru）。
- 开头不寒暄，第一句直接确认收到具体询盘。
- 中间列出推荐 SKU（型号 + 一句卖点 + 单价 + MOQ + lead time）。
- 询问 2 个关键澄清问题（数量是否锁定、目标单价、需要的认证），不要超过 2 个。
- 结尾给出回复时限承诺（"will send formal PI within 24h after spec confirmation"）。
- 不要写"as an AI"、不要承诺折扣、不要捏造规格。
- 不超过 180 词；签名行只写 "Aria · Sales Assistant"。`;

export async function draftReply(
  inquiry: Inquiry,
  parsed: InquiryParsed,
  matches: MatchedProduct[],
  products: Product[],
  customer: Customer | null,
) {
  const matchedDetail = matches
    .map((m) => {
      const p = products.find((x) => x.sku === m.sku);
      if (!p) return `${m.sku} (not found)`;
      return `${p.sku} | ${p.nameEn} | ${p.unitPrice} ${p.currency} | MOQ ${p.moq} | lead ${p.leadTime} | ${m.reason}`;
    })
    .join("\n");

  const result = await ariaGenerateText({
    system: SYSTEM,
    prompt: `询盘原文：\n${inquiry.body}\n\n语言：${inquiry.language}\n\n解析摘要：${parsed.intentSummary}\n紧急度：${parsed.inferredUrgency}\n情绪：${parsed.buyerSentiment}\n\n推荐 SKU：\n${matchedDetail}\n\n客户档案：${customer ? `${customer.companyName} (${customer.tier}级，年采 ${customer.annualPurchaseUSD} USD)` : "新客户"}\n\n请用 ${inquiry.language} 撰写邮件正文。第一行输出 SUBJECT: <主题>，空一行后输出正文。`,
    fallback: () => deterministicDraft(inquiry, parsed, matches, products, customer),
  });

  const parsedDraft = parseSubjectAndBody(result.text, inquiry);
  return { value: parsedDraft, via: result.via };
}

function parseSubjectAndBody(raw: string, inquiry: Inquiry): DraftReply {
  const m = raw.match(/SUBJECT:\s*(.+)/i);
  const subject = m ? m[1].trim() : `Re: ${inquiry.subject}`;
  const body = raw.replace(/SUBJECT:\s*.+\n?/i, "").trim();
  return { language: inquiry.language, subject, body };
}

const TEMPLATES = {
  en: {
    open: (intent: string) =>
      `Thank you for the inquiry on ${intent}. I have reviewed the spec and pulled candidate SKUs from our catalog.`,
    matchHeader: "Recommended SKUs:",
    questions: (q: string[]) => `To finalize the formal PI, please confirm:\n${q.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    closing: "Will send a formal PI with packing list and shipping options within 24h after the above is confirmed.",
    sign: "Best regards,\nAria · Sales Assistant",
    fallbackQs: ["Final order quantity & target unit price (USD/pc, FOB)", "Required certifications (CE / GOST / API / ISO)"],
  },
  es: {
    open: (intent: string) =>
      `Gracias por su consulta sobre ${intent}. Hemos revisado la especificación y seleccionado SKUs candidatos de nuestro catálogo.`,
    matchHeader: "SKUs recomendados:",
    questions: (q: string[]) => `Para emitir la PI formal, por favor confirme:\n${q.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    closing: "Enviaremos una PI formal con lista de empaque y opciones de envío dentro de 24h tras la confirmación.",
    sign: "Saludos cordiales,\nAria · Asistente de Ventas",
    fallbackQs: ["Cantidad final del pedido y precio objetivo (USD/pza FOB)", "Certificaciones requeridas (CE / GOST / RoHS)"],
  },
  ru: {
    open: (intent: string) =>
      `Благодарим за запрос по ${intent}. Мы изучили спецификацию и подобрали SKU из нашего каталога.`,
    matchHeader: "Рекомендуемые SKU:",
    questions: (q: string[]) => `Для оформления формального PI, пожалуйста, подтвердите:\n${q.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    closing: "Формальный PI с упаковочным листом и вариантами доставки будет отправлен в течение 24 часов после подтверждения.",
    sign: "С уважением,\nAria · Помощник отдела продаж",
    fallbackQs: ["Финальное количество и целевая цена (USD/шт FOB)", "Требуемые сертификаты (GOST / CE / API)"],
  },
};

function deterministicDraft(
  inquiry: Inquiry,
  parsed: InquiryParsed,
  matches: MatchedProduct[],
  products: Product[],
  customer: Customer | null,
): string {
  const tpl = TEMPLATES[inquiry.language];
  const intent = parsed.intentSummary || inquiry.subject;

  const matchLines = matches.length
    ? matches
        .map((m, i) => {
          const p = products.find((x) => x.sku === m.sku);
          if (!p) return `${i + 1}. ${m.sku}`;
          return `${i + 1}. ${p.sku} — ${p.nameEn} | ${p.unitPrice} ${p.currency} | MOQ ${p.moq} | ${p.leadTime} | ${m.reason}`;
        })
        .join("\n")
    : "(awaiting clarification — see questions below)";

  const questions: string[] = [];
  if (!parsed.quantity) questions.push(tpl.fallbackQs[0]);
  else questions.push(`Confirm the order quantity is ${parsed.quantity} pcs and your target FOB unit price.`);
  if (parsed.certificationsNeeded.length === 0) questions.push(tpl.fallbackQs[1]);
  else questions.push(`Please confirm the required certifications: ${parsed.certificationsNeeded.join(", ")}.`);

  const customerLine = customer && customer.tier === "A"
    ? inquiry.language === "en"
      ? "As a long-term partner, I have flagged this for priority handling."
      : inquiry.language === "es"
        ? "Como socio de largo plazo, esta solicitud ha sido marcada como prioritaria."
        : "Как долгосрочный партнёр, ваш запрос отмечен как приоритетный."
    : "";

  const subject = `SUBJECT: Re: ${inquiry.subject}`;
  const body = [
    tpl.open(intent),
    customerLine,
    "",
    tpl.matchHeader,
    matchLines,
    "",
    tpl.questions(questions),
    "",
    tpl.closing,
    "",
    tpl.sign,
  ]
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n");

  return `${subject}\n\n${body}`;
}
