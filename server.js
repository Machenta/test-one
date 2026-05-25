import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";

function loadDotenv(path = ".env") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotenv();

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 4000);
const serviceId = process.env.SERVICE_ID || "x4-test-one";
const displayName = process.env.SERVICE_NAME || "X4 Test One";
const themeColor = process.env.THEME_COLOR || "#2563eb";
const message = process.env.SERVICE_MESSAGE || "Hello from test one";
const featureBadge = "Feature workspace: coordinator button enabled";
const globalCounterUrl = (process.env.GLOBAL_COUNTER_URL || "").replace(/\/$/, "");
let globalCount = 0;
const peerUrls = (process.env.PEER_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

async function readGlobalCounter() {
  if (!globalCounterUrl) return { count: globalCount, owner: serviceId };

  const response = await fetch(`${globalCounterUrl}/api/global-count`);
  if (!response.ok) throw new Error(`Counter service returned ${response.status}`);
  return response.json();
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

async function incrementGlobalCounter(incrementedBy = serviceId) {
  if (!globalCounterUrl) {
    globalCount += 1;
    return { count: globalCount, owner: serviceId, incrementedBy };
  }

  const response = await fetch(`${globalCounterUrl}/api/global-count/increment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serviceId: incrementedBy })
  });
  if (!response.ok) throw new Error(`Counter service returned ${response.status}`);
  return response.json();
}

async function peerStatuses() {
  const results = [];
  for (const url of peerUrls) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/api/status`);
      results.push({ url, ok: response.ok, data: await response.json() });
    } catch (error) {
      results.push({ url, ok: false, error: error.message });
    }
  }
  return results;
}

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

function html() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${displayName}</title>
    <style>
      :root {
        color-scheme: light;
        --accent: ${themeColor};
        --ink: #111827;
        --muted: #4b5563;
        --panel: rgba(255, 255, 255, 0.94);
        --line: rgba(17, 24, 39, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        color: var(--ink);
        background:
          linear-gradient(140deg, rgba(17, 24, 39, 0.04), rgba(17, 24, 39, 0) 36%),
          linear-gradient(135deg, var(--accent), #f8fafc 70%);
      }
      main {
        width: min(920px, calc(100vw - 32px));
        min-height: 100vh;
        display: grid;
        align-content: center;
        gap: 16px;
        padding: 32px 0;
        margin: 0 auto;
      }
      section {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: clamp(20px, 4vw, 36px);
        box-shadow: 0 22px 70px rgba(17, 24, 39, 0.16);
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 28px;
      }
      h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 4rem);
        line-height: 0.95;
        letter-spacing: 0;
      }
      p { color: var(--muted); font-size: 1rem; line-height: 1.6; margin: 8px 0 0; }
      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 10px;
        color: var(--ink);
        font-size: 0.82rem;
        font-weight: 800;
        white-space: nowrap;
      }
      .counter {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 20px;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
        padding: 24px 0;
        margin: 24px 0;
      }
      .count-label {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      #count {
        display: block;
        margin-top: 4px;
        color: var(--ink);
        font-size: clamp(3rem, 12vw, 6.5rem);
        font-weight: 900;
        line-height: 0.9;
      }
      button {
        border: 0;
        border-radius: 6px;
        background: var(--accent);
        color: white;
        font-weight: 700;
        min-height: 44px;
        padding: 12px 16px;
        cursor: pointer;
      }
      button.secondary { background: #111827; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; }
      pre {
        min-height: 120px;
        white-space: pre-wrap;
        background: #111827;
        color: #e5e7eb;
        padding: 16px;
        border-radius: 6px;
        overflow: auto;
      }
      @media (max-width: 640px) {
        header, .counter { grid-template-columns: 1fr; }
        header { display: block; }
        .badge { margin-top: 16px; white-space: normal; }
        .counter { justify-items: start; }
        .actions, button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <header>
          <div>
            <h1>${displayName}</h1>
            <p>${message}</p>
          </div>
          <span class="badge">${featureBadge}</span>
        </header>
        <div class="counter" aria-live="polite">
          <div>
            <span class="count-label">Global count</span>
            <span id="count">...</span>
          </div>
          <button id="increment" type="button">Increment global count</button>
        </div>
        <p><strong>Peers:</strong> ${peerUrls.length ? peerUrls.join(", ") : "none"}</p>
        <div class="actions">
          <button id="flow" class="secondary" type="button">Ask the other services</button>
        </div>
        <pre id="output">Click the button to exercise cross-repo API calls.</pre>
      </section>
    </main>
    <script>
      const count = document.getElementById("count");
      async function refreshCount() {
        const response = await fetch("./api/global-count");
        const data = await response.json();
        count.textContent = data.count;
      }

      document.getElementById("increment").addEventListener("click", async () => {
        const response = await fetch("./api/global-count/increment", { method: "POST" });
        const data = await response.json();
        count.textContent = data.count;
      });

      document.getElementById("flow").addEventListener("click", async () => {
        const output = document.getElementById("output");
        output.textContent = "Calling peers...";
        const response = await fetch("./api/flow");
        output.textContent = JSON.stringify(await response.json(), null, 2);
      });

      refreshCount().catch(() => {
        count.textContent = "!";
      });
    </script>
  </body>
</html>`;
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/health") return json(response, 200, { ok: true, serviceId });
  if (url.pathname === "/api/status") return json(response, 200, { serviceId, displayName, themeColor, message, featureBadge, peers: peerUrls });
  if (url.pathname === "/api/flow") return json(response, 200, { serviceId, displayName, featureBadge, peers: await peerStatuses() });
  if (url.pathname === "/api/global-count") {
    try {
      return json(response, 200, await readGlobalCounter());
    } catch (error) {
      return json(response, 502, { error: error.message });
    }
  }
  if (url.pathname === "/api/global-count/increment" && request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      return json(response, 200, await incrementGlobalCounter(body.serviceId || serviceId));
    } catch (error) {
      return json(response, 502, { error: error.message });
    }
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html());
}).listen(port, host, () => {
  console.log(`${serviceId} listening on ${host}:${port}`);
});
