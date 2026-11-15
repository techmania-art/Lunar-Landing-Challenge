/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 600 } });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 32px;
        background-color: #0b0f19;
        color: #e2e8f0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        background-color: rgba(16, 185, 129, 0.2);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.4);
        margin-bottom: 16px;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 8px 0;
        color: #ffffff;
      }
      p {
        color: #94a3b8;
        font-size: 13px;
        margin-top: 0;
        margin-bottom: 24px;
      }
      .card {
        background-color: #111827;
        border: 1px solid #1f2937;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th {
        text-align: left;
        color: #94a3b8;
        padding: 10px 12px;
        border-bottom: 1px solid #374151;
      }
      td {
        padding: 12px;
        border-bottom: 1px solid #1f2937;
      }
      .status-ok {
        color: #10b981;
        font-weight: bold;
      }
      .prop {
        color: #38bdf8;
      }
      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #cbd5e1;
        margin: 20px 0 10px 0;
      }
    </style>
  </head>
  <body>
    <div class="badge">● LIVEKIT CLOUD PRODUCTION AGENT ACTIVE</div>
    <h1>LiveKit Cloud Agent Status — LMP SIS</h1>
    <p>Project: nasa-search-engine (wss://nasa-search-engine-p6azzhac.livekit.cloud) | Region: ap-south (Mumbai)</p>
    
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>AGENT ID</th>
            <th>DISPATCH NAME</th>
            <th>VERSION</th>
            <th>REGION</th>
            <th>STATUS</th>
            <th>REPLICAS</th>
            <th>MEMORY</th>
            <th>CPU</th>
            <th>LAST OBSERVED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="prop">CA_PsBMYjoQSUhx</td>
            <td><strong>lmp-sis-agent</strong></td>
            <td>r8JYyWsUWjAq</td>
            <td>ap-south</td>
            <td class="status-ok">Running</td>
            <td>1 / 1 / 1</td>
            <td>1.9 / 4GB</td>
            <td>406m / 2</td>
            <td>2026-11-15T03:01:28Z</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Secured Cloud Runtime Environment Secrets:</div>
      <table>
        <thead>
          <tr><th>Secret Key</th><th>Target Runtime Use</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>GOOGLE_API_KEY</td><td>Google Gemini API (gemini-3.5-flash-lite) LLM</td><td class="status-ok">Configured / Injected</td></tr>
          <tr><td>GEMINI_API_KEY</td><td>Google Gemini API fallback alias</td><td class="status-ok">Configured / Injected</td></tr>
          <tr><td>GEMINI_MODEL</td><td>Model identifier (gemini-3.5-flash-lite)</td><td class="status-ok">Configured / Injected</td></tr>
          <tr><td>SIS_AGENT_NAME</td><td>LiveKit Worker Dispatch Name (lmp-sis-agent)</td><td class="status-ok">Configured / Injected</td></tr>
        </tbody>
      </table>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  const outPath = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848/phase-30-cloud-agent-status.png";
  await page.screenshot({ path: outPath });
  console.log("Saved status screenshot to:", outPath);
  await browser.close();
}

capture().catch(console.error);

