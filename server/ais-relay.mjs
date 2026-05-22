import http from "node:http";
import { URL } from "node:url";
import WebSocket from "ws";

const host = "127.0.0.1";
const port = Number(process.env.AIS_RELAY_PORT || 8790);
const upstreamUrl = "wss://stream.aisstream.io/v0/stream";
const allowInsecureTls = process.env.AIS_RELAY_INSECURE_TLS !== "0";

let upstreamSocket = null;
let upstreamState = "idle";
let lastScope = "nc";
let lastError = "";
let lastCloseCode = null;
let lastCloseReason = "";
const sseClients = new Set();

function aisBoundingBoxes(scope) {
  if (scope === "world") return [[[-90, -180], [90, 180]]];
  if (scope === "pacific") {
    return [
      [[-50, 120], [25, 180]],
      [[-50, -180], [25, -120]],
    ];
  }
  return [[[-26, 161], [-17, 171]]];
}

function writeJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function broadcast(packet) {
  const raw = `data: ${JSON.stringify(packet)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(raw);
    } catch {
      sseClients.delete(client);
    }
  }
}

function closeUpstream() {
  if (!upstreamSocket) return;
  try {
    upstreamSocket.close();
  } catch {
    // no-op
  }
  upstreamSocket = null;
  upstreamState = "idle";
}

function connectUpstream({ apiKey, scope }) {
  closeUpstream();
  upstreamState = "connecting";
  lastScope = scope || "nc";
  lastError = "";
  lastCloseCode = null;
  lastCloseReason = "";
  broadcast({ kind: "status", state: "connecting", scope: lastScope });

  upstreamSocket = new WebSocket(upstreamUrl, {
    rejectUnauthorized: !allowInsecureTls ? true : false,
  });

  upstreamSocket.addEventListener("open", () => {
    const subscription = {
      APIKey: apiKey,
      BoundingBoxes: aisBoundingBoxes(lastScope),
      FilterMessageTypes: ["PositionReport", "ShipStaticData"],
    };
    upstreamSocket.send(JSON.stringify(subscription));
    upstreamState = "connected";
    lastError = "";
    broadcast({ kind: "status", state: "connected", scope: lastScope });
  });

  upstreamSocket.addEventListener("message", async (event) => {
    let payload = "";
    try {
      if (typeof event.data === "string") {
        payload = event.data;
      } else if (event.data && typeof event.data.text === "function") {
        payload = await event.data.text();
      } else if (event.data instanceof ArrayBuffer) {
        payload = Buffer.from(event.data).toString("utf8");
      } else {
        payload = String(event.data);
      }
      broadcast({ kind: "ais", message: JSON.parse(payload) });
    } catch (error) {
      broadcast({ kind: "error", message: "Message AIS invalide recu du flux amont." });
      console.warn("[AIS relay] message parse error:", error?.message || error);
    }
  });

  upstreamSocket.addEventListener("error", () => {
    lastError = "Erreur de connexion au flux AISStream.";
    broadcast({ kind: "error", message: lastError });
  });

  upstreamSocket.addEventListener("close", (event) => {
    upstreamState = "idle";
    lastCloseCode = event.code ?? null;
    lastCloseReason = event.reason || "";
    if (!lastError && event.code !== 1000) {
      lastError = `Flux AIS ferme (code ${event.code || "inconnu"}).`;
    }
    upstreamSocket = null;
    broadcast({
      kind: "status",
      state: "closed",
      code: event.code,
      reason: event.reason || "",
    });
  });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    writeJson(res, 200, {
      ok: true,
      upstreamState,
      scope: lastScope,
      clients: sseClients.size,
      upstreamUrl,
      allowInsecureTls,
      lastError,
      lastCloseCode,
      lastCloseReason,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ kind: "status", state: upstreamState, scope: lastScope })}\n\n`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/connect") {
    try {
      const body = await readJson(req);
      const apiKey = String(body.apiKey || "").trim();
      const scope = String(body.scope || "nc").trim();
      if (!apiKey) {
        writeJson(res, 400, { ok: false, error: "apiKey manquante" });
        return;
      }
      connectUpstream({ apiKey, scope });
      writeJson(res, 200, { ok: true, state: "connecting", scope });
    } catch (error) {
      writeJson(res, 400, { ok: false, error: "Requete invalide" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/disconnect") {
    closeUpstream();
    broadcast({ kind: "status", state: "closed", code: 1000, reason: "manual" });
    writeJson(res, 200, { ok: true });
    return;
  }

  writeJson(res, 404, { ok: false, error: "not found" });
});

server.listen(port, host, () => {
  console.log(`[AIS relay] listening on http://${host}:${port}`);
});
