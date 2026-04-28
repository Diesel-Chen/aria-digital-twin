import type { InquiryEvent } from "../types";
import { fmtCNY, fmtSeconds, type RoiSnapshot } from "../roi";
import type { Revision } from "../flow/revision-log";

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nl2br = (s: string) => escape(s).replace(/\n/g, "<br/>");

function routeBadge(route: string): string {
  const map: Record<string, string> = {
    auto_send: "background:#0a7d4f;color:#d4f5e1;",
    review: "background:#a26a06;color:#fff2cc;",
    human: "background:#9a3328;color:#ffd9d4;",
    non_business: "background:#3a3a3a;color:#bbb;",
  };
  const label: Record<string, string> = {
    auto_send: "✓ 自动发送",
    review: "⏳ 送审",
    human: "👤 转人工",
    non_business: "✕ 非业务",
  };
  return `<span class="badge" style="${map[route] || ""}">${label[route] || route}</span>`;
}

function eventCard(e: InquiryEvent, revisions: Revision[]): string {
  const rev = revisions.find((r) => r.inquiryId === e.inquiryId);
  return `
  <article class="card">
    <header class="card-head">
      <div>
        <span class="inquiry-id">${e.inquiryId}</span>
        <span class="lang-tag">${e.language.toUpperCase()}</span>
        ${e.isBlindSpotHour ? '<span class="blind-tag">🌙 时差盲区</span>' : ""}
      </div>
      ${routeBadge(e.route)}
    </header>
    <div class="grid">
      <section>
        <h4>① 询盘原文</h4>
        <div class="meta">${escape(e.fromInfo || "")}<br/>${new Date(e.receivedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</div>
        <div class="subject">${escape(e.subject || "")}</div>
        <pre class="body">${escape(e.body || "")}</pre>
      </section>
      <section>
        <h4>② 解析结果</h4>
        ${
          e.parsed
            ? `
          <ul class="kv">
            <li><b>意图</b><span>${escape(e.parsed.intentSummary)}</span></li>
            <li><b>类别</b><span>${e.parsed.productCategory}</span></li>
            <li><b>数量</b><span>${e.parsed.quantity ?? "未明示"}</span></li>
            <li><b>目的港</b><span>${escape(e.parsed.destinationPort ?? "未明示")}</span></li>
            <li><b>紧急度</b><span class="urgency-${e.parsed.inferredUrgency}">${e.parsed.inferredUrgency}</span></li>
            <li><b>情绪</b><span>${e.parsed.buyerSentiment}</span></li>
            <li><b>认证</b><span>${e.parsed.certificationsNeeded.join(", ") || "—"}</span></li>
            <li><b>关键词</b><span>${e.parsed.keywords.slice(0, 5).map(escape).join(" / ") || "—"}</span></li>
          </ul>
          ${e.parsed.rejectReason ? `<div class="reject">⛔ ${escape(e.parsed.rejectReason)}</div>` : ""}
        `
            : "<em>无</em>"
        }
      </section>
      <section>
        <h4>③ 候选 SKU</h4>
        ${
          e.matches.length
            ? `<table class="matches">
              <thead><tr><th>SKU</th><th>置信</th><th>类型</th><th>理由</th></tr></thead>
              <tbody>
                ${e.matches
                  .map(
                    (m) => `<tr>
                  <td><code>${escape(m.sku)}</code></td>
                  <td><span class="conf conf-${m.confidence >= 0.85 ? "high" : m.confidence >= 0.6 ? "mid" : "low"}">${m.confidence.toFixed(2)}</span></td>
                  <td>${m.tag}</td>
                  <td>${escape(m.reason)}</td>
                </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>`
            : "<em>无候选（已转人工补品）</em>"
        }
      </section>
      <section>
        <h4>④ 草稿</h4>
        ${
          e.draft
            ? `<div class="draft">
                <div class="draft-subject">${escape(e.draft.subject)}</div>
                <pre>${escape(e.draft.body)}</pre>
              </div>`
            : "<em>未生成</em>"
        }
        ${
          rev
            ? `<details class="revision">
                <summary>📝 业务员修订（diff ${(rev.diffPercent * 100).toFixed(0)}%）</summary>
                <div class="rev-summary">${escape(rev.summary)}</div>
                <pre>${escape(rev.finalDraft)}</pre>
              </details>`
            : ""
        }
      </section>
      <section class="route-section">
        <h4>⑤ 路由决策</h4>
        <div>${routeBadge(e.route)}</div>
        <p class="route-reason">${escape(e.routeReason)}</p>
        <div class="meta-line">
          ⚙ ${e.llmVia.map((v) => `<span class="via-${v}">${v}</span>`).join(" → ")}
          · ${e.durationMs}ms
        </div>
        ${
          e.followUp
            ? `<div class="follow-up">📨 72h 沉默触发跟进：<em>${escape(e.followUp.subject)}</em></div>`
            : ""
        }
        ${
          e.customerReply
            ? `<div class="reply-back">📬 客户回复：${escape(e.customerReply.body.slice(0, 80))}...</div>`
            : ""
        }
      </section>
    </div>
  </article>`;
}

export function renderDemoReport(args: {
  events: (InquiryEvent & { fromInfo?: string; subject?: string; body?: string })[];
  revisions: Revision[];
  roi: RoiSnapshot;
  revisionPatterns: { pattern: string; count: number }[];
}): string {
  const { events, revisions, roi, revisionPatterns } = args;
  const liveCount = events.filter((e) => e.llmVia.includes("live")).length;
  const mockCount = events.length - liveCount;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>Aria 数字分身 — Demo 端到端运行报告</title>
<style>
  :root {
    --bg: #0e1220; --surface: #161a2c; --line: #232844;
    --text: #e6e9f5; --muted: #9aa0bd; --accent: #6c8aff; --accent2: #8b6cff;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif; background: var(--bg); color: var(--text); margin: 0; line-height: 1.55; }
  .top { padding: 28px 40px; border-bottom: 1px solid var(--line); background: linear-gradient(120deg, #1a2042, #0e1220); }
  h1 { margin: 0; font-size: 22px; }
  .subtitle { color: var(--muted); margin-top: 6px; font-size: 13px; }
  .container { padding: 24px 40px 80px; }
  .roi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .roi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .roi-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; }
  .roi-value { font-size: 24px; font-weight: 600; margin-top: 4px; color: var(--accent); }
  .roi-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .section-title { display: flex; align-items: center; gap: 10px; margin: 28px 0 14px; font-size: 15px; }
  .section-title::before { content: ""; display: inline-block; width: 4px; height: 16px; background: var(--accent); border-radius: 2px; }
  .card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 14px; overflow: hidden; }
  .card-head { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.02); }
  .inquiry-id { font-family: ui-monospace, monospace; color: var(--accent); font-size: 12px; }
  .lang-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--line); color: var(--muted); margin-left: 8px; }
  .blind-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #2c2350; color: #c8b8ff; margin-left: 8px; }
  .grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.4fr 1fr; gap: 0; }
  .grid > section { padding: 12px 14px; border-right: 1px solid var(--line); min-width: 0; }
  .grid > section:last-child { border-right: none; }
  h4 { margin: 0 0 8px; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .meta { font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .subject { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
  pre { font-family: ui-monospace, "SF Mono", monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; margin: 0; color: #cdd2e8; max-height: 220px; overflow: auto; }
  .body { background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; }
  .kv { list-style: none; padding: 0; margin: 0; font-size: 11px; }
  .kv li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px dashed var(--line); }
  .kv b { color: var(--muted); font-weight: normal; }
  .urgency-high { color: #ff7676; font-weight: 600; }
  .urgency-normal { color: var(--text); }
  .urgency-low { color: var(--muted); }
  .reject { margin-top: 6px; padding: 6px 8px; background: rgba(220,80,80,0.15); border-left: 2px solid #d65a5a; font-size: 11px; }
  table.matches { width: 100%; font-size: 11px; border-collapse: collapse; }
  table.matches th { text-align: left; color: var(--muted); font-weight: normal; padding: 4px 4px; border-bottom: 1px solid var(--line); }
  table.matches td { padding: 4px 4px; border-bottom: 1px solid var(--line); vertical-align: top; }
  code { font-family: ui-monospace, monospace; font-size: 10.5px; color: var(--accent); }
  .conf { display: inline-block; padding: 1px 5px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 10px; }
  .conf-high { background: rgba(50,180,90,0.2); color: #7ee0a3; }
  .conf-mid { background: rgba(220,170,40,0.2); color: #f0d166; }
  .conf-low { background: rgba(220,80,80,0.2); color: #ff8a8a; }
  .draft-subject { font-size: 11px; color: var(--accent); margin-bottom: 4px; }
  .draft pre { background: rgba(108,138,255,0.06); padding: 8px; border-radius: 4px; max-height: 240px; }
  .revision { margin-top: 8px; padding: 8px; background: rgba(255,200,80,0.07); border-left: 2px solid #d4a73a; border-radius: 4px; }
  .revision summary { cursor: pointer; font-size: 11px; color: #f0d166; }
  .rev-summary { font-size: 11px; color: var(--muted); margin: 4px 0; }
  .route-section { font-size: 11px; }
  .route-reason { color: var(--muted); margin: 6px 0; line-height: 1.5; }
  .meta-line { color: var(--muted); font-size: 10.5px; margin-top: 6px; }
  .via-live { color: #7ee0a3; }
  .via-mock { color: var(--muted); }
  .badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 500; }
  .follow-up, .reply-back { margin-top: 8px; padding: 6px 8px; background: rgba(108,138,255,0.08); border-radius: 4px; font-size: 11px; }
  .pattern-list { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
  .pattern-list ul { margin: 0; padding-left: 20px; }
  .footer { color: var(--muted); font-size: 11px; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); }
  @media (max-width: 1100px) { .grid { grid-template-columns: 1fr 1fr; } .grid > section { border-right: none; border-bottom: 1px solid var(--line); } .roi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
  <div class="top">
    <h1>Aria 数字分身 · Demo 端到端运行报告</h1>
    <div class="subtitle">15 条多语言询盘 → 解析 → SKU 匹配 → 草稿 → 路由决策 → 跟进编排 → ROI 看板 ｜ LLM: ${liveCount} live / ${mockCount} mock</div>
  </div>
  <div class="container">

    <h2 class="section-title">ROI 看板（本批次模拟为月度数据）</h2>
    <div class="roi-grid">
      <div class="roi-card"><div class="roi-label">替代人力成本</div><div class="roi-value">${fmtCNY(roi.laborSavingsCNY)}</div><div class="roi-sub">${roi.inquiriesProcessed} 条询盘 × ¥${roi.inputs.costPerInquiryCNY}/条</div></div>
      <div class="roi-card"><div class="roi-label">挽回流失线索价值</div><div class="roi-value">${fmtCNY(roi.recoveredLeadValueCNY)}</div><div class="roi-sub">盲区时段 ${roi.blindSpotInquiries} 条 / 已促回复 ${roi.blindSpotConverted} 条</div></div>
      <div class="roi-card"><div class="roi-label">效率提升折算</div><div class="roi-value">${fmtCNY(roi.efficiencyValueCNY)}</div><div class="roi-sub">平均首响 ${fmtSeconds(roi.avgFirstResponseSeconds)} (vs 24h 人工)</div></div>
      <div class="roi-card"><div class="roi-label">月度净增量价值</div><div class="roi-value">${fmtCNY(roi.netMonthlyValueCNY)}</div><div class="roi-sub">订阅 ¥${roi.inputs.monthlySubscriptionCNY}/月 · 回本 ${roi.paybackMonths === Number.POSITIVE_INFINITY ? "—" : roi.paybackMonths + "月"}</div></div>
    </div>
    <div class="roi-grid">
      <div class="roi-card"><div class="roi-label">自动发送</div><div class="roi-value" style="color:#7ee0a3">${roi.inquiriesAutoSent}</div><div class="roi-sub">高置信 + 紧急度可控</div></div>
      <div class="roi-card"><div class="roi-label">送审队列</div><div class="roi-value" style="color:#f0d166">${roi.inquiriesReview}</div><div class="roi-sub">业务员快速审核</div></div>
      <div class="roi-card"><div class="roi-label">转人工</div><div class="roi-value" style="color:#ff8a8a">${roi.inquiriesHuman}</div><div class="roi-sub">情绪/认证/低置信触发</div></div>
      <div class="roi-card"><div class="roi-label">跟进覆盖率</div><div class="roi-value">${(roi.followUpCoverageRate * 100).toFixed(0)}%</div><div class="roi-sub">vs 行业基线 42%</div></div>
    </div>

    <h2 class="section-title">15 条询盘 5 段式处理详情</h2>
    ${events.map((e) => eventCard(e, revisions)).join("")}

    ${
      revisionPatterns.length
        ? `<h2 class="section-title">人工修订模式聚合（深度陪跑闭环）</h2>
          <div class="pattern-list">
            <p style="color:var(--muted);font-size:12px;margin-top:0;">连续 4 周稳定出现的修订模式 → 自动生成 prompt 优化建议</p>
            <ul>
              ${revisionPatterns.map((p) => `<li><b>${escape(p.pattern)}</b> · 出现 ${p.count} 次</li>`).join("")}
            </ul>
          </div>`
        : ""
    }

    <div class="footer">
      生成于 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
      · LLM via: ${liveCount > 0 ? "live + mock 混合" : "deterministic mock"}
      · 数据回流路径：每条事件已按需写入 events.jsonl，可作为评估集与 prompt 训练素材。
    </div>
  </div>
</body>
</html>`;
}
