"use strict";

const state = {
  mode: "sample",
  samples: [],
  customers: [],
  productCount: 0,
  runMode: "mock",
  selectedSample: null,
};

const $ = (id) => document.getElementById(id);

async function loadSamples() {
  try {
    const r = await fetch("/api/samples");
    const data = await r.json();
    state.samples = data.inquiries || [];
    state.customers = data.customers || [];
    state.productCount = data.products || 0;
    renderSamples();
    $("data-stat").textContent = `${state.samples.length} 询盘 · ${state.productCount} SKU · ${state.customers.length} 客户`;
  } catch (e) {
    $("sample-list").innerHTML = `<div class="empty">加载失败：${e.message}</div>`;
  }
}

function renderSamples() {
  const list = $("sample-list");
  list.innerHTML = "";
  state.samples.forEach((q, i) => {
    const el = document.createElement("div");
    el.className = "sample-item";
    el.dataset.id = q.id;
    el.innerHTML = `
      <div class="sample-id">${q.id}</div>
      <div class="sample-meta">
        <span class="lang-tag">${q.language}</span>
        <span class="urg-tag ${q.urgencyHint}">${q.urgencyHint}</span>
        ${escapeHtml(q.fromCompany)}
      </div>
      <div class="sample-subject">${escapeHtml(q.subject)}</div>
    `;
    el.addEventListener("click", () => selectSample(q.id));
    list.appendChild(el);
    if (i === 0) selectSample(q.id);
  });
}

function selectSample(id) {
  state.selectedSample = state.samples.find((s) => s.id === id) || null;
  document.querySelectorAll(".sample-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
  renderInquiryDisplay();
}

function renderInquiryDisplay() {
  const box = $("inquiry-display");
  let q;
  if (state.mode === "sample") {
    q = state.selectedSample;
    if (!q) { box.innerHTML = '<div class="empty">请选择一条样例</div>'; return; }
  } else {
    q = collectCustomInquiry();
  }
  box.innerHTML = `
    <div class="field"><span class="lang-tag">${q.language}</span><span class="urg-tag ${q.urgencyHint || "normal"}">${q.urgencyHint || "normal"}</span></div>
    <div class="field"><div class="field-label">From</div><div class="field-value">${escapeHtml(q.fromCompany)} &lt;${escapeHtml(q.fromEmail)}&gt;</div></div>
    <div class="field"><div class="field-label">Subject</div><div class="field-value">${escapeHtml(q.subject)}</div></div>
    <div class="field"><div class="field-label">Body</div><div class="draft-box">${escapeHtml(q.body)}</div></div>
  `;
}

function collectCustomInquiry() {
  return {
    id: `INQ-CUSTOM-${Date.now()}`,
    fromCompany: $("c-company").value,
    fromEmail: $("c-email").value,
    customerId: null,
    language: $("c-language").value,
    urgencyHint: $("c-urgency").value,
    subject: $("c-subject").value,
    body: $("c-body").value,
  };
}

async function processOne() {
  const btn = $("btn-process");
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="loading"></span>处理中…';
  try {
    const inquiry = state.mode === "sample" ? state.selectedSample : collectCustomInquiry();
    if (!inquiry) throw new Error("请先选择询盘");
    const r = await fetch("/api/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(inquiry),
    });
    const data = await r.json();
    state.runMode = data.mode || "mock";
    $("run-mode").textContent = state.runMode === "live" ? "LIVE LLM" : "MOCK（确定性算法）";
    $("batch-result").style.display = "none";
    $("single-result").style.display = "block";
    renderSingleResult(data.event);
  } catch (e) {
    alert("处理失败：" + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function renderSingleResult(ev) {
  renderParsed(ev.parsed, ev);
  renderMatches(ev.matchedProductDetails || ev.matches);
  renderDraft(ev.draft);
  renderRoute(ev.route, ev.routeReason);
}

function renderParsed(p, ev) {
  if (!p) { $("parsed-block").innerHTML = "—"; return; }
  const specsEntries = Object.entries(p.detectedSpecs || {});
  const specsHtml = specsEntries.length
    ? specsEntries.map(([k, v]) => `<span class="pill">${escapeHtml(k)}: ${escapeHtml(String(v))}</span>`).join("")
    : '<span class="field-value">未提取到具体规格</span>';
  const businessFlag = p.isBusiness === false
    ? `<span class="pill" style="color:var(--bad)">非业务（${escapeHtml(p.rejectReason || "")}）</span>`
    : '<span class="pill" style="color:var(--good)">是</span>';
  $("parsed-block").innerHTML = `
    <div class="result-grid">
      <div>
        <div class="field"><div class="field-label">语种</div><div class="field-value"><span class="pill">${ev.language}</span></div></div>
        <div class="field"><div class="field-label">产品类目</div><div class="field-value"><span class="pill">${escapeHtml(p.productCategory)}</span></div></div>
        <div class="field"><div class="field-label">推断紧急度</div><div class="field-value"><span class="pill">${p.inferredUrgency}</span></div></div>
        <div class="field"><div class="field-label">客户情绪</div><div class="field-value"><span class="pill">${p.buyerSentiment}</span></div></div>
      </div>
      <div>
        <div class="field"><div class="field-label">数量</div><div class="field-value">${p.quantity != null ? p.quantity : "未明示"}</div></div>
        <div class="field"><div class="field-label">目的港</div><div class="field-value">${escapeHtml(p.destinationPort || "—")}</div></div>
        <div class="field"><div class="field-label">认证要求</div><div class="field-value">${(p.certificationsNeeded || []).map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join("") || "—"}</div></div>
        <div class="field"><div class="field-label">是否有效业务</div><div class="field-value">${businessFlag}</div></div>
      </div>
      <div class="full">
        <div class="field"><div class="field-label">意图摘要</div><div class="field-value">${escapeHtml(p.intentSummary || "")}</div></div>
        <div class="field"><div class="field-label">关键词</div><div class="field-value">${(p.keywords || []).map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join("") || "—"}</div></div>
        <div class="field"><div class="field-label">检测到的规格</div><div class="field-value">${specsHtml}</div></div>
      </div>
    </div>
  `;
}

function renderMatches(arr) {
  if (!arr || !arr.length) { $("matches-block").innerHTML = '<div class="empty">无候选 SKU（可能是非业务询盘）</div>'; return; }
  $("matches-block").innerHTML = arr.map((m) => {
    const pct = Math.round((m.confidence || 0) * 100);
    const p = m.product;
    return `
      <div class="match-item">
        <div class="match-head">
          <div class="match-sku">${m.sku}${p ? ` · ${escapeHtml(p.nameEn || p.nameZh || "")}` : ""}</div>
          <div class="match-tag ${m.tag || "alternate"}">${m.tag || "alternate"} · ${pct}%</div>
        </div>
        <div class="conf-bar"><span style="width:${pct}%"></span></div>
        <div class="match-rsn">${escapeHtml(m.reason || "")}</div>
        ${p ? `<div class="match-rsn" style="margin-top:6px;color:var(--muted)">类目 ${escapeHtml(p.category || "")} · 单价 ${escapeHtml(p.currency || "USD")} ${p.unitPrice ?? "—"} · MOQ ${p.moq ?? "—"} · 交期 ${escapeHtml(p.leadTime || "—")} · 库存 ${p.stock ?? "—"}</div>` : ""}
      </div>
    `;
  }).join("");
}

function renderDraft(d) {
  if (!d) { $("draft-block").innerHTML = '<div class="empty">无草稿（已转人工或非业务）</div>'; return; }
  $("draft-block").innerHTML = `
    <div class="field"><div class="field-label">语种</div><div class="field-value"><span class="pill">${d.language}</span></div></div>
    <div class="field"><div class="field-label">主题</div><div class="field-value">${escapeHtml(d.subject)}</div></div>
    <div class="field"><div class="field-label">正文</div><div class="draft-box">${escapeHtml(d.body)}</div></div>
  `;
}

function renderRoute(decision, reason) {
  if (!decision) { $("route-block").innerHTML = "—"; return; }
  const labels = {
    auto_send: "🚀 自动发送",
    review: "👀 送审队列",
    human: "🙋 转人工",
    non_business: "🚫 已过滤（非业务）",
  };
  const cls = decision === "non_business" ? "human" : decision;
  $("route-block").innerHTML = `
    <div class="route-card ${cls}">
      <div class="route-name ${cls}">${labels[decision] || decision}</div>
      <div class="route-rsn">${escapeHtml(reason || "")}</div>
    </div>
  `;
}

async function batchRun() {
  const btn = $("btn-batch");
  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="loading"></span>批跑 15 条…';
  try {
    const r = await fetch("/api/process-batch", { method: "POST" });
    const data = await r.json();
    $("single-result").style.display = "none";
    $("batch-result").style.display = "block";
    renderRoi(data.roi);
    renderBatchTable(data.events);
  } catch (e) {
    alert("批跑失败：" + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

function fmtCNY(v) {
  if (!Number.isFinite(v)) return "—";
  if (v >= 10000) return `¥${(v / 10000).toFixed(1)}w`;
  return `¥${Math.round(v).toLocaleString("zh-CN")}`;
}
function fmtSec(s) {
  if (s == null || !Number.isFinite(s)) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

function renderRoi(roi) {
  if (!roi) { $("roi-block").innerHTML = "—"; return; }
  $("roi-block").innerHTML = `
    <div class="roi-grid">
      <div class="roi-card">
        <div class="roi-num">${fmtCNY(roi.laborSavingsCNY)}</div>
        <div class="roi-label">替代人力成本</div>
        <div class="roi-sub">本批次 ${roi.inquiriesProcessed} 条 × 单条 ¥${roi.inputs?.costPerInquiryCNY || 30}</div>
      </div>
      <div class="roi-card">
        <div class="roi-num">${fmtCNY(roi.recoveredLeadValueCNY)}</div>
        <div class="roi-label">挽回流失线索</div>
        <div class="roi-sub">${roi.blindSpotInquiries} 条盲区询盘 · ${roi.blindSpotConverted} 条获回复</div>
      </div>
      <div class="roi-card">
        <div class="roi-num">${fmtSec(roi.avgFirstResponseSeconds)}</div>
        <div class="roi-label">平均首响</div>
        <div class="roi-sub">vs 人工 12-18 h</div>
      </div>
      <div class="roi-card">
        <div class="roi-num">${fmtCNY(roi.netMonthlyValueCNY)}</div>
        <div class="roi-label">月度净增量（按本批次外推）</div>
        <div class="roi-sub">已扣 ¥${roi.inputs?.monthlySubscriptionCNY || 5000}/月订阅 · 回本 ${Number.isFinite(roi.paybackMonths) ? roi.paybackMonths + " 月" : "—"}</div>
      </div>
    </div>
    <div style="margin-top:14px; font-size:12px; color:var(--muted)">
      路由分布：自动发送 <b style="color:var(--good)">${roi.inquiriesAutoSent}</b> ·
      送审 <b style="color:var(--warn)">${roi.inquiriesReview}</b> ·
      转人工 <b style="color:var(--bad)">${roi.inquiriesHuman}</b> ·
      跟进覆盖率 <b style="color:var(--text)">${Math.round((roi.followUpCoverageRate || 0) * 100)}%</b>
    </div>
  `;
}

function renderBatchTable(events) {
  if (!events || !events.length) { $("batch-table-wrap").innerHTML = "—"; return; }
  $("batch-table-wrap").innerHTML = `
    <div style="overflow-x:auto"><table class="batch-table">
      <thead>
        <tr>
          <th>询盘</th>
          <th>语种</th>
          <th>类目</th>
          <th>Top SKU</th>
          <th>置信</th>
          <th>路由</th>
          <th>盲区</th>
          <th>耗时</th>
        </tr>
      </thead>
      <tbody>
        ${events.map((e) => {
          const top = (e.matches && e.matches[0]) || {};
          return `<tr>
            <td><b>${e.inquiryId}</b></td>
            <td>${e.language || "—"}</td>
            <td>${e.parsed?.productCategory || "—"}</td>
            <td>${top.sku || "—"}</td>
            <td>${top.confidence != null ? Math.round(top.confidence * 100) + "%" : "—"}</td>
            <td><span class="badge ${e.route}">${e.route}</span></td>
            <td>${e.isBlindSpotHour ? "✅" : ""}</td>
            <td>${e.durationMs}ms</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>
  `;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  $("tab-sample").addEventListener("click", () => {
    state.mode = "sample";
    $("tab-sample").classList.add("active");
    $("tab-custom").classList.remove("active");
    $("sample-section").style.display = "";
    $("custom-section").style.display = "none";
    renderInquiryDisplay();
  });
  $("tab-custom").addEventListener("click", () => {
    state.mode = "custom";
    $("tab-custom").classList.add("active");
    $("tab-sample").classList.remove("active");
    $("sample-section").style.display = "none";
    $("custom-section").style.display = "";
    renderInquiryDisplay();
  });
  ["c-company", "c-email", "c-language", "c-urgency", "c-subject", "c-body"].forEach((id) => {
    $(id).addEventListener("input", () => { if (state.mode === "custom") renderInquiryDisplay(); });
  });
  $("btn-process").addEventListener("click", processOne);
  $("btn-batch").addEventListener("click", batchRun);
  $("run-mode").textContent = "MOCK（确定性算法）";
  loadSamples();
});
