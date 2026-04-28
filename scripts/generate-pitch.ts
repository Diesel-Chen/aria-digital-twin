import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { processInquiry } from "../src/flow/pipeline";
import { computeRoi } from "../src/roi";
import { renderPitchHtml } from "../src/report/pitch-template";
import type { Customer, Inquiry, InquiryEvent, Product } from "../src/types";

const root = resolve(import.meta.dir, "..");

function loadJson<T>(p: string): T {
  return JSON.parse(readFileSync(resolve(root, p), "utf8"));
}

const inquiries = loadJson<Inquiry[]>("data/inquiries.json");
const products = loadJson<Product[]>("data/products.json");
const customers = loadJson<Customer[]>("data/customers.json");

console.log("▶ 计算 Demo 批次 ROI（用于嵌入 pitch 文档实测口径）");
const events: InquiryEvent[] = [];
for (const inquiry of inquiries) {
  const ev = await processInquiry(inquiry, products, customers);
  events.push(ev);
}
events[0].customerReply = { repliedAt: new Date().toISOString(), body: "OK" };
events[1].customerReply = { repliedAt: new Date().toISOString(), body: "OK" };
events[7].customerReply = { repliedAt: new Date().toISOString(), body: "OK" };

const roi = computeRoi(events);

mkdirSync(resolve(root, "docs"), { recursive: true });
const html = renderPitchHtml({
  roi,
  generatedAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
});
writeFileSync(resolve(root, "docs/pitch.html"), html);
console.log(`✅ docs/pitch.html — ${(html.length / 1024).toFixed(1)} KB`);
