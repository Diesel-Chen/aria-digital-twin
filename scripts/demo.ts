import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { processInquiry } from "../src/flow/pipeline";
import { planFollowUp } from "../src/flow/follow-up";
import {
  diffPercent,
  aggregateRevisionPatterns,
  type Revision,
} from "../src/flow/revision-log";
import { computeRoi } from "../src/roi";
import { renderDemoReport } from "../src/report/render-html";
import type { Customer, Inquiry, InquiryEvent, Product } from "../src/types";

const root = resolve(import.meta.dir, "..");

function loadJson<T>(p: string): T {
  return JSON.parse(readFileSync(resolve(root, p), "utf8"));
}

const inquiries = loadJson<Inquiry[]>("data/inquiries.json");
const products = loadJson<Product[]>("data/products.json");
const customers = loadJson<Customer[]>("data/customers.json");

const liveMode = process.env.LIVE === "1";
console.log(`\n▶ Aria demo — ${inquiries.length} inquiries, mode=${liveMode ? "LIVE" : "MOCK"}`);
console.log(`  products=${products.length}, customers=${customers.length}\n`);

type EnrichedEvent = InquiryEvent & {
  fromInfo: string;
  subject: string;
  body: string;
};

const events: EnrichedEvent[] = [];
const eventsLog: string[] = [];

for (const inquiry of inquiries) {
  const t0 = Date.now();
  const ev = await processInquiry(inquiry, products, customers);
  const elapsed = Date.now() - t0;
  const enriched: EnrichedEvent = {
    ...ev,
    fromInfo: `${inquiry.fromCompany} <${inquiry.fromEmail}>`,
    subject: inquiry.subject,
    body: inquiry.body,
  };
  events.push(enriched);
  eventsLog.push(JSON.stringify(ev));
  const flag = ev.route === "auto_send" ? "✓" : ev.route === "review" ? "⏳" : ev.route === "human" ? "👤" : "✕";
  console.log(`  ${flag} ${inquiry.id} [${inquiry.language}] ${inquiry.fromCompany.slice(0, 32).padEnd(32)} → ${ev.route.padEnd(13)} ${elapsed}ms ${ev.isBlindSpotHour ? "🌙" : ""}`);
}

console.log("\n▶ 模拟客户回复（用于 ROI 挽回线索归因）");
const replyTargets = ["INQ-001", "INQ-002", "INQ-008"];
for (const e of events) {
  if (replyTargets.includes(e.inquiryId)) {
    e.customerReply = {
      repliedAt: new Date().toISOString(),
      body:
        e.language === "es"
          ? "Gracias, confirmamos cantidad y certificaciones. Por favor envíen PI."
          : e.language === "ru"
            ? "Спасибо, подтверждаем спецификацию. Отправьте формальное PI."
            : "Thanks, the spec and quantity look fine. Please send formal PI.",
    };
    console.log(`  ↩ ${e.inquiryId} 客户已回复（推进至议价阶段）`);
  }
}

console.log("\n▶ 模拟 72h 沉默 → 自动跟进编排");
for (const e of events) {
  if (!e.customerReply && e.draft && e.isBusiness) {
    const fu = planFollowUp(e, 76);
    if (fu.shouldFollowUp) {
      e.followUp = {
        sentAt: new Date().toISOString(),
        subject: fu.draftSubject!,
        body: fu.draftBody!,
      };
      console.log(`  📨 ${e.inquiryId} 触发跟进：${fu.draftSubject}`);
    }
  }
}

console.log("\n▶ 模拟人工修订（深度陪跑闭环数据采集）");
const revisions: Revision[] = [];
function recordRevision(inquiryId: string, editedBody: string, summary: string, editor: string) {
  const ev = events.find((x) => x.inquiryId === inquiryId);
  if (!ev || !ev.draft) return;
  const original = ev.draft.body;
  const dp = diffPercent(original, editedBody);
  revisions.push({
    inquiryId,
    editor,
    editedAt: new Date().toISOString(),
    originalDraft: original,
    finalDraft: editedBody,
    diffPercent: dp,
    summary,
  });
  ev.revision = { editedAt: new Date().toISOString(), editor, diffPercent: dp, summary };
  console.log(`  📝 ${inquiryId} 修订 diff=${(dp * 100).toFixed(0)}%  · ${summary}`);
}

const rev001 = events.find((e) => e.inquiryId === "INQ-001")!;
if (rev001.draft) {
  recordRevision(
    "INQ-001",
    rev001.draft.body.replace(
      "30% TT deposit",
      "We can match your 30% TT deposit + 70% against BL copy terms",
    ) + "\n\nP.S. We also offer free sample of seal kit for your evaluation.",
    "补充付款条款明确表态 + 增加样品赠送钩子",
    "Mike (Senior Sales)",
  );
}
const rev003 = events.find((e) => e.inquiryId === "INQ-003")!;
if (rev003.draft) {
  recordRevision(
    "INQ-003",
    rev003.draft.body.replace(/Lead time.*$/m, "Tiempo de entrega: 7 días una vez confirmada PO."),
    "Lead time 表述本地化 + 强调可议价",
    "María (Sales LATAM)",
  );
}
const rev014 = events.find((e) => e.inquiryId === "INQ-014")!;
if (rev014.draft) {
  recordRevision(
    "INQ-014",
    rev014.draft.body + "\n\nFor 200K+ M8 bolts we can offer mill direct pricing — please share target price.",
    "大批量订单加挂厂直价格钩子",
    "Vincent (KA Manager)",
  );
}

console.log("\n▶ 计算 ROI");
const roi = computeRoi(events);
console.log(`  替代成本: ${roi.laborSavingsCNY}  挽回线索: ${roi.recoveredLeadValueCNY}  效率: ${roi.efficiencyValueCNY}  净: ${roi.netMonthlyValueCNY} CNY/月`);

const revisionPatterns = aggregateRevisionPatterns(revisions);

console.log("\n▶ 写出 events.jsonl + docs/demo-report.html");
writeFileSync(resolve(root, "events.jsonl"), eventsLog.join("\n") + "\n");
mkdirSync(resolve(root, "docs"), { recursive: true });
const html = renderDemoReport({ events, revisions, roi, revisionPatterns });
writeFileSync(resolve(root, "docs/demo-report.html"), html);

console.log(`\n✅ Done — open docs/demo-report.html\n`);
