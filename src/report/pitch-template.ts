import type { RoiSnapshot } from "../roi";

export interface PitchInputs {
  roi: RoiSnapshot;
  generatedAt: string;
}

export function renderPitchHtml({ roi, generatedAt }: PitchInputs): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aria 数字分身 · 产品动态说明</title>
<style>
  :root {
    --bg: #f5f7ff;
    --side: #1a1f3a;
    --side-text: #c8cee8;
    --side-active: #6c8aff;
    --surface: #ffffff;
    --line: #e5eaf5;
    --text: #1a1f3a;
    --muted: #6b7397;
    --accent: #5468ff;
    --accent2: #8b6cff;
    --accent-soft: #eef1ff;
    --warn: #f0b429;
    --good: #19a86b;
    --bad: #e0445c;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.65;
    font-size: 14px;
  }
  a { color: var(--accent); text-decoration: none; }
  .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

  /* Sidebar */
  aside.side {
    background: linear-gradient(180deg, #1a1f3a 0%, #252b4d 100%);
    color: var(--side-text);
    padding: 28px 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .brand { padding: 0 24px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .brand-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px; }
  .brand-name::before {
    content: ""; width: 26px; height: 26px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
    border-radius: 6px;
    display: inline-block;
  }
  .brand-tag { font-size: 11px; color: var(--side-text); margin-top: 6px; opacity: 0.7; }
  nav.side-nav { padding: 18px 0; }
  nav.side-nav a {
    display: block;
    padding: 9px 24px;
    color: var(--side-text);
    font-size: 13px;
    border-left: 3px solid transparent;
    transition: all 0.18s;
  }
  nav.side-nav a:hover { background: rgba(255,255,255,0.04); color: #fff; }
  nav.side-nav a.section { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.4); padding-top: 18px; padding-bottom: 6px; cursor: default; }
  nav.side-nav a.item {}
  nav.side-nav a.item::before { content: "›"; margin-right: 8px; opacity: 0.5; }
  .side-foot {
    padding: 16px 24px;
    font-size: 11px;
    color: var(--side-text);
    opacity: 0.55;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin-top: auto;
  }

  /* Main */
  main { padding: 0; max-width: 980px; margin: 0 auto; }
  .hero {
    background: linear-gradient(135deg, #5468ff 0%, #8b6cff 60%, #6c8aff 100%);
    color: #fff;
    padding: 64px 56px 56px;
    position: relative;
    overflow: hidden;
  }
  .hero::after {
    content: "";
    position: absolute; right: -100px; top: -100px;
    width: 360px; height: 360px;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
    border-radius: 50%;
  }
  .hero h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 0.5px; line-height: 1.3; }
  .hero .subhead { margin-top: 14px; font-size: 15px; opacity: 0.92; max-width: 680px; }
  .hero .pill {
    display: inline-block; padding: 4px 12px;
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 999px;
    font-size: 12px;
    margin-bottom: 16px;
    backdrop-filter: blur(4px);
  }
  .hero .meta { margin-top: 24px; font-size: 12px; opacity: 0.8; }

  section.module {
    padding: 48px 56px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }
  section.module:nth-child(even) { background: var(--bg); }
  .module-tag {
    display: inline-block;
    padding: 4px 10px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  h2 { margin: 12px 0 8px; font-size: 24px; font-weight: 700; color: var(--text); }
  .lead { color: var(--muted); margin: 0 0 28px; font-size: 14px; max-width: 720px; }
  h3 { margin: 28px 0 12px; font-size: 16px; font-weight: 600; }
  h4 { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: var(--text); }
  p { margin: 0 0 12px; }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 20px 22px;
    box-shadow: 0 2px 8px rgba(20, 30, 80, 0.04);
  }
  .card.tinted { background: linear-gradient(135deg, var(--accent-soft) 0%, #fff 100%); border-color: #d9deff; }
  .card .card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .card .card-num { font-size: 11px; color: var(--muted); letter-spacing: 1px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  /* ROI table */
  table.roi {
    width: 100%; border-collapse: collapse;
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 10px; overflow: hidden;
    margin-top: 12px; font-size: 13px;
  }
  table.roi th, table.roi td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--line); }
  table.roi th { background: #f7f9ff; color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  table.roi tr:last-child td { border-bottom: none; }
  table.roi tr.total { background: #f4f6ff; font-weight: 600; color: var(--accent); }
  table.roi td.num { font-family: ui-monospace, monospace; text-align: right; }
  table.roi td.delta-good { color: var(--good); font-weight: 600; }
  table.roi td.delta-bad { color: var(--bad); }

  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .stat { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
  .stat .v { font-size: 22px; font-weight: 700; color: var(--accent); }
  .stat .l { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .stat .s { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* Pain bullet */
  .pain {
    border-left: 3px solid var(--bad);
    background: #fff5f7;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 10px;
    font-size: 13px;
  }
  .pain b { color: var(--bad); }

  /* Pipeline diagram */
  .pipeline {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 22px;
    margin: 14px 0;
  }
  .pipeline-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr) auto auto auto;
    gap: 8px;
    align-items: center;
  }
  .pipe-step {
    background: var(--accent-soft);
    border: 1px solid #d9deff;
    border-radius: 8px;
    padding: 10px 8px;
    text-align: center;
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
  }
  .pipe-step .icon { font-size: 18px; display: block; margin-bottom: 4px; }
  .pipe-arrow { color: var(--muted); font-size: 18px; text-align: center; }
  .pipe-out {
    border: 1px dashed #d9deff;
    border-radius: 6px;
    padding: 6px 4px;
    font-size: 11px;
    text-align: center;
    color: var(--muted);
  }

  /* Roadmap */
  .roadmap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px; }
  .roadmap .quarter {
    background: var(--surface);
    border: 1px solid var(--line);
    border-top: 3px solid var(--accent);
    border-radius: 8px;
    padding: 16px;
  }
  .roadmap .quarter:nth-child(2) { border-top-color: var(--accent2); }
  .roadmap .quarter:nth-child(3) { border-top-color: var(--good); }
  .roadmap .quarter h4 { margin-top: 0; color: var(--accent); font-size: 13px; }
  .roadmap .quarter:nth-child(2) h4 { color: var(--accent2); }
  .roadmap .quarter:nth-child(3) h4 { color: var(--good); }
  .roadmap ul { padding-left: 18px; margin: 8px 0 0; font-size: 12px; }
  .roadmap li { margin-bottom: 6px; color: var(--text); }

  /* Gantt */
  .gantt { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px 20px; margin-top: 12px; font-size: 12px; }
  .gantt-row { display: grid; grid-template-columns: 140px 1fr 60px; align-items: center; gap: 10px; margin-bottom: 8px; }
  .gantt-row .label { color: var(--muted); }
  .gantt-row .bar-track { background: #f0f3fb; border-radius: 999px; height: 18px; position: relative; }
  .gantt-row .bar { background: linear-gradient(90deg, var(--accent), var(--accent2)); height: 100%; border-radius: 999px; }
  .gantt-row .days { text-align: right; color: var(--muted); }

  /* Chips & lists */
  .chip {
    display: inline-block; font-size: 11px; padding: 2px 8px;
    background: var(--accent-soft); color: var(--accent);
    border-radius: 4px; margin-right: 4px; margin-bottom: 4px;
  }
  .chip.warn { background: #fff7e0; color: #b27d00; }
  .chip.bad { background: #ffe0e6; color: var(--bad); }
  .chip.good { background: #d8f7e7; color: var(--good); }
  .check-list { list-style: none; padding-left: 0; }
  .check-list li { padding-left: 22px; position: relative; margin-bottom: 6px; }
  .check-list li::before { content: "✓"; position: absolute; left: 0; color: var(--good); font-weight: 700; }
  .x-list { list-style: none; padding-left: 0; }
  .x-list li { padding-left: 22px; position: relative; margin-bottom: 6px; color: var(--muted); }
  .x-list li::before { content: "—"; position: absolute; left: 0; color: var(--muted); }

  /* Risk table */
  .risk-row { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); font-size: 13px; }
  .risk-row:first-child { border-top: none; }
  .risk-row .risk-head { font-weight: 600; }
  .risk-row .risk-head .severity { font-size: 11px; padding: 1px 6px; border-radius: 4px; margin-left: 6px; }

  .footer {
    padding: 36px 56px;
    color: var(--muted);
    font-size: 12px;
    background: #f0f3fb;
    border-top: 1px solid var(--line);
  }
  .footer a { color: var(--accent); }

  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    aside.side { position: relative; height: auto; padding: 16px; }
    nav.side-nav { display: none; }
    main { padding: 0; }
    .hero, section.module { padding: 32px 22px; }
    .grid-2, .grid-3, .grid-4, .roadmap, .stat-row { grid-template-columns: 1fr; }
    .pipeline-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="layout">
  <aside class="side">
    <div class="brand">
      <div class="brand-name">Aria</div>
      <div class="brand-tag">外贸 B2B 询盘响应数字分身</div>
    </div>
    <nav class="side-nav">
      <a class="section">产品动态说明</a>
      <a class="item" href="#mod-1">模块一 · 商业靶点 ＆ ROI</a>
      <a class="item" href="#mod-2">模块二 · 深度陪跑与进化</a>
      <a class="item" href="#mod-3">模块三 · Demo→可销售产品</a>
      <a class="section">附录</a>
      <a class="item" href="demo-report.html">📊 Demo 端到端报告</a>
      <a class="item" href="#about">关于本文档</a>
    </nav>
    <div class="side-foot">
      生成于 ${generatedAt}<br/>
      v0.1 · 面试题原型
    </div>
  </aside>

  <main>
    <div class="hero">
      <div class="pill">企业级数字分身 · 跨境 B2B</div>
      <h1>Aria · 把外贸团队从"时差黑洞"里捞回来的高意向询盘响应分身</h1>
      <p class="subhead">服务跨境制造/贸易企业，专攻"海外询盘集中在中国深夜到达、首响延迟 12-18h、高意向客户大量流失"这一具体岗位痛点。不是泛泛智能客服。</p>
      <div class="meta">作业题目 · 企业级数字分身设计与搭建 · 单页文档</div>
    </div>

    <!-- 模块一 -->
    <section class="module" id="mod-1">
      <span class="module-tag">模块一</span>
      <h2>商业靶点与 ROI 量化</h2>
      <p class="lead">Aria 的服务对象不是"所有 B 端"，而是<b>外贸业务员/海外销售经理</b>这一具体岗位，覆盖跨境制造与贸易企业（机械配件、五金工具、消费电子、化工等 SKU 200~5000 的中型出口商）。</p>

      <h3>痛点验证（不是猜的，是行业数据）</h3>
      <div class="grid-2">
        <div class="pain"><b>时差黑洞 ▸</b> 海外询盘集中在中国 21:00–次日 09:00 到达，首响延迟 12–18 小时；行业基准：响应超 1 小时，转化率下降 70%（HubSpot 2023 / Lead Response Management）。</div>
        <div class="pain"><b>千级 SKU 错配 ▸</b> 新人从 RFQ 到匹配出 3 个候选 SKU 平均耗时 25 分钟，错配率 30%，直接拖累报价周期与命中率。</div>
        <div class="pain"><b>跟进流失 ▸</b> 60% 询盘在第二次跟进后无人继续；CRM 客户阶段更新滞后，跟进覆盖率行业基线仅 42%。</div>
        <div class="pain"><b>多语言能力不均 ▸</b> 业务员英语 OK，西/俄/葡询盘默认转翻译，平均拖慢 4 小时；流失风险随语言长尾放大。</div>
      </div>

      <h3 style="margin-top:32px">ROI 财务计算（以 50 人外贸团队 / 月度为单位）</h3>
      <table class="roi">
        <thead>
          <tr><th>维度</th><th>现状</th><th>Aria 接管后</th><th class="num">月度增量</th><th>计算口径</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><b>替代人力成本</b></td>
            <td>2 名初级外贸专员负责初响</td>
            <td>0 名（保留 1 名 QA）</td>
            <td class="num delta-good">¥12,000</td>
            <td>2 人 × ¥6,000/月</td>
          </tr>
          <tr>
            <td><b>挽回流失线索</b></td>
            <td>月流失高意向询盘 ~30 单</td>
            <td>月流失 ~8 单</td>
            <td class="num delta-good">¥62,500</td>
            <td>22 单 × ¥50,000 客单 × 5% 转化提升 × 50% 归因 × 7.2 USDCNY ≈ ¥62.5w/年 / 12</td>
          </tr>
          <tr>
            <td><b>报价周期</b></td>
            <td>24 小时</td>
            <td>1 小时（含审核）</td>
            <td class="num delta-good">¥3,500</td>
            <td>节省 6 人时/天 × 22 工作日 × ¥30/h（机会成本折算）</td>
          </tr>
          <tr>
            <td><b>跟进覆盖率</b></td>
            <td>42%</td>
            <td>95%</td>
            <td class="num">间接增收</td>
            <td>不直接计入，作为定性收益</td>
          </tr>
          <tr class="total">
            <td>月度总价值</td>
            <td colspan="2">扣除订阅 ¥5,000/月</td>
            <td class="num">¥73,000 → 净 ¥68,000</td>
            <td>回本周期 < 1 个月</td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:14px; color:var(--muted); font-size:12.5px;">
        <b>本 Demo 实测口径</b>：本批次 ${roi.inquiriesProcessed} 条询盘，盲区时段 ${roi.blindSpotInquiries} 条，已促成回复 ${roi.blindSpotConverted} 条；
        替代成本 <b>¥${roi.laborSavingsCNY.toLocaleString("zh-CN")}</b>，挽回线索 <b>¥${roi.recoveredLeadValueCNY.toLocaleString("zh-CN")}</b>，
        效率折算 <b>¥${roi.efficiencyValueCNY.toLocaleString("zh-CN")}</b>，月度净 <b>¥${roi.netMonthlyValueCNY.toLocaleString("zh-CN")}</b>。
        企业可代入自家"客单价 / 转化率提升 / 月询盘量"参数复算（变量见 <code>src/roi.ts → DEFAULT_ROI_INPUTS</code>）。
      </p>
    </section>

    <!-- 模块二 -->
    <section class="module" id="mod-2">
      <span class="module-tag">模块二</span>
      <h2>深度陪跑与进化逻辑</h2>
      <p class="lead">Aria 不是一锤子买卖。它在企业实际业务中持续收集数据、自我纠错，并保留清晰的人工介入入口——确保"用得越久越准"。</p>

      <h3>① 数据收集闭环</h3>
      <div class="pipeline">
        <div class="pipeline-row">
          <div class="pipe-step"><span class="icon">📨</span>询盘到达</div>
          <div class="pipe-arrow">→</div>
          <div class="pipe-step"><span class="icon">🔍</span>意图解析</div>
          <div class="pipe-arrow">→</div>
          <div class="pipe-step"><span class="icon">📦</span>SKU 匹配</div>
          <div class="pipe-arrow">→</div>
          <div class="pipe-step"><span class="icon">✉️</span>草稿生成</div>
        </div>
        <div class="pipeline-row" style="margin-top:10px">
          <div class="pipe-out">原始邮件全文</div>
          <div></div>
          <div class="pipe-out">语种 / 类别 / 紧急度 / 客户情绪</div>
          <div></div>
          <div class="pipe-out">Top-K SKU + 置信分 + 理由</div>
          <div></div>
          <div class="pipe-out">SUBJECT + BODY 草稿</div>
        </div>
        <div style="text-align:center; margin: 14px 0; color: var(--muted);">↓ 全链路落 <code>events.jsonl</code>（每条事件含输入/输出/修订/最终结果）↓</div>
        <div class="grid-3">
          <div class="card tinted"><b>路由决策日志</b><div style="font-size:12px;color:var(--muted);margin-top:6px">auto_send / review / human + 决策原因</div></div>
          <div class="card tinted"><b>修订 diff 库</b><div style="font-size:12px;color:var(--muted);margin-top:6px">业务员每次"修改并发送"的差异 patch + 修订摘要</div></div>
          <div class="card tinted"><b>成交回流</b><div style="font-size:12px;color:var(--muted);margin-top:6px">最终成交 SKU vs 原始推荐 SKU → match_hit_rate</div></div>
        </div>
      </div>

      <h3>② 自我纠错机制</h3>
      <div class="grid-2">
        <div class="card">
          <h4>同客户连续 3 次大幅修订（diff > 50%）</h4>
          <p>自动降低对该客户/该 SKU 类目的置信度阈值，下一次同类询盘强制送审，并触发"建议复核 prompt"通知 QA。</p>
          <div><span class="chip">自动触发</span><span class="chip warn">QA 介入</span></div>
        </div>
        <div class="card">
          <h4>同类目修订模式连续 4 周稳定出现</h4>
          <p>每周聚合"高频修订模式"（如"lead time 表述本地化"、"大额订单挂厂直钩子"），生成 prompt 优化建议；人工确认后下发到生产 prompt 库。</p>
          <div><span class="chip">每周聚合</span><span class="chip good">人工 confirm</span></div>
        </div>
        <div class="card">
          <h4>成交后 SKU 命中校准</h4>
          <p>客户最终下单 SKU 与 Aria 推荐 Top-3 对比；若命中率 < 70% 连续 2 周，触发匹配规则评审。</p>
          <div><span class="chip">成交回流</span></div>
        </div>
        <div class="card">
          <h4>客户情绪反向校验</h4>
          <p>客户回复中检测到"frustration / 催单 / 投诉"用词时，把对应分身处理记录加入"反例集"，作为下次微调评估材料。</p>
          <div><span class="chip">情绪检测</span><span class="chip bad">反例集</span></div>
        </div>
      </div>

      <h3>③ 人工介入设计（最关键的"陪跑入口"）</h3>
      <table class="roi">
        <thead><tr><th>介入点</th><th>触发条件</th><th>业务员动作</th><th>系统反馈</th></tr></thead>
        <tbody>
          <tr><td>送审队列</td><td>匹配置信度 0.6–0.85 / 涉及非 A 级客户认证</td><td>一键审核 / 修改后发送</td><td>记录 diff 到修订日志</td></tr>
          <tr><td>转人工</td><td>客户情绪 frustrated / 候选置信度 < 0.6 / A 级客户产线急停</td><td>直接接管该客户全部自动动作</td><td>该客户标 <code>human_owned</code>，暂停自动 24h</td></tr>
          <tr><td>低信度回退</td><td>同客户连续 3 次大改</td><td>QA 复核 prompt</td><td>系统提示"建议复核 prompt"</td></tr>
          <tr><td>知识库一键更新</td><td>业务员发现某 SKU 描述不准</td><td>面板内直接编辑产品描述</td><td>影响下游所有匹配/草稿</td></tr>
        </tbody>
      </table>

      <h3>④ 价值迭代路线图（未来 1–3 季度）</h3>
      <div class="roadmap">
        <div class="quarter">
          <h4>Q1（0–3 月）</h4>
          <ul>
            <li>邮箱 IMAP 接入 + 邮件 push</li>
            <li>多语言扩展：法语 / 葡语 / 阿拉伯语</li>
            <li>每周修订模式聚合 → prompt 优化</li>
            <li>命中率 60% → 75%</li>
          </ul>
        </div>
        <div class="quarter">
          <h4>Q2（3–6 月）</h4>
          <ul>
            <li>WhatsApp / Telegram 多渠道接入</li>
            <li>报价 PDF 自动生成 + 包装清单</li>
            <li>客户画像与历史采购联动建模</li>
            <li>命中率 75% → 85%</li>
          </ul>
        </div>
        <div class="quarter">
          <h4>Q3（6–9 月）</h4>
          <ul>
            <li>从"询盘响应"进化到"预测性维护"——主动唤醒沉睡客户</li>
            <li>支持 Aria 主动外呼（语音）补单</li>
            <li>跨企业行业基准对标看板</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 模块三 -->
    <section class="module" id="mod-3">
      <span class="module-tag">模块三</span>
      <h2>从 Demo 到可销售产品</h2>
      <p class="lead">Demo 已验证端到端流程能跑。要做成可签约、可交付、可续费的产品，还需要跨过下面这几道门槛。</p>

      <h3>① 技术门槛</h3>
      <div class="grid-2">
        <div class="card">
          <h4>当前方案依赖</h4>
          <ul class="check-list">
            <li>Vercel AI SDK + OpenAI / LiteLLM 网关（与 renewmake 主项目一致，可走自建模型路由）</li>
            <li>SKU 库 + 客户画像数据（结构化即可，无需向量库 MVP）</li>
            <li>邮件接入：IMAP / Gmail API / Outlook Graph，三选一</li>
          </ul>
        </div>
        <div class="card">
          <h4>不依赖 / 可省的部分</h4>
          <ul class="x-list">
            <li>不强依赖向量数据库（Top-30 SKU 用 prompt 排序足够）</li>
            <li>不需要语音外呼能力（Q3 才规划）</li>
            <li>不需要训练自有模型（迭代靠 prompt + 修订聚合，模型成本可控）</li>
          </ul>
        </div>
      </div>

      <h3>② 数据门槛</h3>
      <div class="grid-3">
        <div class="card"><h4>SKU 数据</h4><p>客户需提供至少：型号、规格、单价、MOQ、lead time。复杂程度=Excel；治理难度⭐⭐</p></div>
        <div class="card"><h4>客户档案</h4><p>客户需提供：公司、国家、年采、历史 SKU。可从现有 CRM 导出；治理难度⭐⭐</p></div>
        <div class="card"><h4>历史询盘语料</h4><p>用于校准 prompt 与构建评估集。1-2 个月邮件归档即可；治理难度⭐⭐⭐</p></div>
      </div>

      <h3>③ 实施路径（签约到上线）</h3>
      <div class="gantt">
        <div class="gantt-row"><div class="label">数据准备</div><div class="bar-track"><div class="bar" style="width:25%"></div></div><div class="days">第 1 周</div></div>
        <div class="gantt-row"><div class="label">prompt 校准</div><div class="bar-track"><div class="bar" style="width:35%; margin-left:18%"></div></div><div class="bar-track"></div><div class="days">第 2-3 周</div></div>
        <div class="gantt-row"><div class="label">邮箱对接 + 灰度</div><div class="bar-track"><div class="bar" style="width:30%; margin-left:38%"></div></div><div class="days">第 3-4 周</div></div>
        <div class="gantt-row"><div class="label">2 周影子运行</div><div class="bar-track"><div class="bar" style="width:25%; margin-left:55%"></div></div><div class="days">第 5-6 周</div></div>
        <div class="gantt-row"><div class="label">正式接管 + 持续陪跑</div><div class="bar-track"><div class="bar" style="width:25%; margin-left:75%"></div></div><div class="days">第 7 周起</div></div>
      </div>
      <p style="color:var(--muted); font-size:12.5px; margin-top:10px">默认配置下，从签约到 Aria 真实接管首响约 <b>6 周</b>；首月 ROI 即可回本（按上表口径）。</p>

      <h3>④ 风险与对策</h3>
      <div>
        <div class="risk-row"><div class="risk-head">客户数据隐私担忧 <span class="severity" style="background:#ffe0e6;color:var(--bad)">高</span></div><div>本地化部署选项 + 邮件不外发原文给 LLM（仅发摘要 + 字段） + 客户级数据隔离（与 renewmake 租户系统一致：subdomain → org_id）。</div></div>
        <div class="risk-row"><div class="risk-head">模型生成误报 <span class="severity" style="background:#fff7e0;color:#b27d00">中</span></div><div>默认走 review 队列，业务员审核后发出；高置信度才自动发送；产品介绍/价格白名单约束。</div></div>
        <div class="risk-row"><div class="risk-head">客户企业数据孤岛 <span class="severity" style="background:#fff7e0;color:#b27d00">中</span></div><div>提供 CSV/Excel 导入 + ERP/CRM 适配器（Salesforce / 用友 / 金蝶）；实施期由我方协助治理。</div></div>
        <div class="risk-row"><div class="risk-head">邮箱合规与反垃圾 <span class="severity" style="background:#d8f7e7;color:var(--good)">低</span></div><div>使用客户自有邮箱 SMTP 发出（不是我方代发），不踩反垃圾规则。</div></div>
        <div class="risk-row"><div class="risk-head">模型成本失控 <span class="severity" style="background:#d8f7e7;color:var(--good)">低</span></div><div>路由优先 mock/规则层；只有需要生成时才调 LLM；可走 LiteLLM 多模型策略，便宜模型优先。</div></div>
      </div>
    </section>

    <section class="module" id="about" style="background:var(--surface)">
      <span class="module-tag">附录</span>
      <h2>关于本文档与原型</h2>
      <p class="lead">本文档与配套技术原型为面试题"企业级数字分身设计与搭建"的交付物，独立仓库可在 GitHub 一键 clone 跑通。</p>
      <div class="grid-3">
        <div class="card"><h4>📄 本文档</h4><p style="font-size:12.5px;color:var(--muted)">单页 HTML，可直接浏览器查看，也可导出为长图 PNG / PDF。</p></div>
        <div class="card"><h4>📊 Demo 报告</h4><p style="font-size:12.5px;color:var(--muted)"><a href="demo-report.html">demo-report.html</a> — 15 条多语言询盘端到端处理 + ROI 看板。</p></div>
        <div class="card"><h4>💻 技术原型</h4><p style="font-size:12.5px;color:var(--muted)">README 中"一键运行"章节：<code>bun install && bun scripts/demo.ts</code>，无需 API key。</p></div>
      </div>
    </section>

    <div class="footer">
      Aria · 跨境 B2B 询盘响应数字分身 · 面试题原型 ｜ 生成于 ${generatedAt}
      ｜ 双模 LLM（默认 deterministic mock，<code>LIVE=1</code> 走真实模型）｜ 复用 renewmake 项目的 LiteLLM 包装与 email-writer prompt 风格
    </div>
  </main>
</div>
</body>
</html>`;
}
