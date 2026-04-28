import { z } from "zod";
import { ariaGenerateObject } from "../llm";
import type { Customer, InquiryParsed, MatchedProduct, Product } from "../types";

const MatchSchema = z.object({
  matches: z.array(
    z.object({
      sku: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
      tag: z.enum(["exact", "alternate", "upgrade"]),
    }),
  ),
});

const SYSTEM = `你是 Aria 产品匹配专家。从给定 SKU 库中为询盘挑出最多 3 个候选 SKU。
规则：
1. 优先精确匹配（型号、尺寸、压力、材质完全对得上）→ tag = exact，confidence ≥ 0.85。
2. 次选近似平替（参数接近，可作为替代方案）→ tag = alternate，0.65 ≤ confidence < 0.85。
3. 偶尔可推荐升级款（更高规格但同场景）→ tag = upgrade，0.60 ≤ confidence < 0.80。
4. 客户历史买过的同类 SKU 加分 0.05–0.10。
5. 给出简短中文 reason（≤30 字），点出关键匹配点。
6. 全部候选都低于 0.6 时仍保留前 3 名，让人工复审。`;

export async function matchProducts(
  parsed: InquiryParsed,
  products: Product[],
  customer: Customer | null,
) {
  const compactCatalog = products
    .filter((p) => parsed.productCategory === "mixed" || parsed.productCategory === "unknown" || p.category === parsed.productCategory)
    .map((p) => ({
      sku: p.sku,
      name: p.nameEn,
      category: p.category,
      specs: p.specs,
      unitPrice: p.unitPrice,
      moq: p.moq,
    }));

  const result = await ariaGenerateObject<{ matches: MatchedProduct[] }>({
    schema: MatchSchema,
    system: SYSTEM,
    prompt: `询盘解析：${JSON.stringify(parsed, null, 2)}\n\n客户档案：${customer ? JSON.stringify({ tier: customer.tier, country: customer.country, history: customer.historicalSKUs }) : "新客户，无历史"}\n\nSKU 库（已按类别预筛）：${JSON.stringify(compactCatalog, null, 2)}\n\n输出最多 3 个候选 SKU。`,
    fallback: () => ({ matches: deterministicMatch(parsed, products, customer) }),
  });

  return { value: result.value.matches, via: result.via };
}

function deterministicMatch(
  parsed: InquiryParsed,
  products: Product[],
  customer: Customer | null,
): MatchedProduct[] {
  if (!parsed.isBusiness) return [];

  const candidates = products.filter(
    (p) =>
      parsed.productCategory === "mixed" ||
      parsed.productCategory === "unknown" ||
      p.category === parsed.productCategory,
  );

  const scored = candidates.map((p) => {
    let score = 0.3;
    let exactHits = 0;
    let altHits = 0;
    const reasonBits: string[] = [];

    for (const kw of parsed.keywords) {
      const upperKw = kw.toUpperCase();
      if (p.sku.toUpperCase().includes(upperKw)) {
        score += 0.4;
        exactHits += 1;
        reasonBits.push(`SKU 含 ${kw}`);
      } else if (
        p.nameEn.toUpperCase().includes(upperKw) ||
        Object.values(p.specs).some((v) => v.toUpperCase().includes(upperKw))
      ) {
        score += 0.18;
        altHits += 1;
        reasonBits.push(`规格匹配 ${kw}`);
      }
    }

    for (const [k, v] of Object.entries(parsed.detectedSpecs)) {
      const sv = (p.specs[k] || Object.values(p.specs).join(" ")).toLowerCase();
      if (sv.includes(v.toLowerCase())) {
        score += 0.12;
        exactHits += 1;
        reasonBits.push(`${k}=${v} 命中`);
      }
    }

    if (customer?.historicalSKUs.includes(p.sku)) {
      score += 0.08;
      reasonBits.push("客户历史采购");
    }

    if (parsed.quantity && parsed.quantity < p.moq) {
      score -= 0.15;
      reasonBits.push(`数量低于 MOQ ${p.moq}`);
    }

    score = Math.max(0, Math.min(1, score));
    const tag: "exact" | "alternate" | "upgrade" =
      exactHits >= 2 ? "exact" : altHits >= 2 ? "alternate" : "alternate";

    return {
      sku: p.sku,
      confidence: Number(score.toFixed(2)),
      reason: reasonBits.slice(0, 3).join("；") || "类别一致",
      tag,
    };
  });

  return scored
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((m) => ({
      ...m,
      tag:
        m.confidence >= 0.85 ? "exact" : m.confidence >= 0.7 ? "alternate" : "upgrade",
    }));
}
