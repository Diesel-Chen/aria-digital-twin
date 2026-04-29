import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { processInquiry } from "./src/flow/pipeline";
import { computeRoi } from "./src/roi";
import type { Customer, Inquiry, Product } from "./src/types";

const root = import.meta.dir;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function loadJson<T>(p: string): T {
  return JSON.parse(readFileSync(resolve(root, p), "utf8"));
}

const inquiries = loadJson<Inquiry[]>("data/inquiries.json");
const products = loadJson<Product[]>("data/products.json");
const customers = loadJson<Customer[]>("data/customers.json");

const indexHtml = readFileSync(resolve(root, "web/index.html"), "utf8");
const appJs = readFileSync(resolve(root, "web/app.js"), "utf8");

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

const SAMPLE_PROMPTS = inquiries.map((q) => ({
  id: q.id,
  fromCompany: q.fromCompany,
  fromEmail: q.fromEmail,
  customerId: q.customerId,
  language: q.language,
  subject: q.subject,
  body: q.body,
  receivedAt: q.receivedAt,
  urgencyHint: q.urgencyHint,
}));

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return new Response(indexHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (req.method === "GET" && path === "/app.js") {
      return new Response(appJs, {
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    }

    if (req.method === "GET" && path === "/api/samples") {
      return json({ inquiries: SAMPLE_PROMPTS, customers, products: products.length }, 200);
    }
    if (req.method === "GET" && path === "/api/products") {
      return json({ products }, 200);
    }
    if (req.method === "GET" && path === "/api/customers") {
      return json({ customers }, 200);
    }

    if (req.method === "POST" && path === "/api/process") {
      const body = (await req.json()) as Partial<Inquiry>;
      const inquiry: Inquiry = {
        id: body.id || `INQ-CUSTOM-${Date.now()}`,
        fromEmail: body.fromEmail || "buyer@example.com",
        fromCompany: body.fromCompany || "Custom Buyer",
        customerId: body.customerId ?? null,
        subject: body.subject || "(no subject)",
        body: body.body || "",
        language: (body.language as Inquiry["language"]) || "en",
        receivedAt: body.receivedAt || new Date().toISOString(),
        urgencyHint: (body.urgencyHint as Inquiry["urgencyHint"]) || "normal",
      };
      const event = await processInquiry(inquiry, products, customers);
      const matchedProductDetails = event.matches.map((m) => {
        const p = products.find((x) => x.sku === m.sku);
        return { ...m, product: p ?? null };
      });
      return json(
        { event: { ...event, matchedProductDetails }, mode: process.env.LIVE === "1" ? "live" : "mock" },
        200,
      );
    }

    if (req.method === "POST" && path === "/api/process-batch") {
      const events = await Promise.all(
        inquiries.map((q) => processInquiry(q, products, customers)),
      );
      const replyTargets = ["INQ-001", "INQ-002", "INQ-008"];
      for (const e of events) {
        if (replyTargets.includes(e.inquiryId)) {
          e.customerReply = { repliedAt: new Date().toISOString(), body: "Confirmed, please send PI." };
        }
      }
      const roi = computeRoi(events);
      return json({ events, roi }, 200);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`▶ Aria web demo running at http://${server.hostname}:${server.port}`);
console.log(`  mode = ${process.env.LIVE === "1" ? "LIVE LLM" : "MOCK"}`);
console.log(`  samples: ${inquiries.length} inquiries, ${products.length} products, ${customers.length} customers`);
