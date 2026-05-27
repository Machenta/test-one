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
const peerUrls = (process.env.PEER_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

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
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, sans-serif;
        color: #111827;
        background: linear-gradient(135deg, ${themeColor}, #f8fafc 72%);
      }
      main { max-width: 780px; padding: 48px; }
      section {
        background: rgba(255,255,255,0.88);
        border: 1px solid rgba(17,24,39,0.12);
        border-radius: 8px;
        padding: 24px;
      }
      button {
        border: 0;
        border-radius: 6px;
        background: ${themeColor};
        color: white;
        font-weight: 700;
        padding: 12px 16px;
        cursor: pointer;
      }
      pre { white-space: pre-wrap; background: #111827; color: #e5e7eb; padding: 16px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>${displayName}</h1>
        <p>${message}</p>
        <p><small>X4 implementation workflow passed</small></p>
        <p><strong>${featureBadge}</strong></p>
        <p><strong>Peers:</strong> ${peerUrls.length ? peerUrls.join(", ") : "none"}</p>
        <button id="flow">Ask the other services</button>
        <pre id="output">Click the button to exercise cross-repo API calls.</pre>
      </section>
    </main>
    <script>
      document.getElementById("flow").addEventListener("click", async () => {
        const output = document.getElementById("output");
        output.textContent = "Calling peers...";
        const response = await fetch("./api/flow");
        output.textContent = JSON.stringify(await response.json(), null, 2);
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
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html());
}).listen(port, host, () => {
  console.log(`${serviceId} listening on ${host}:${port}`);
});
