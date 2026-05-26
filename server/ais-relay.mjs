import http from "node:http";
import { URL } from "node:url";
import { config } from "./config/env.mjs";
import { AisService } from "./ais/ais-service.mjs";
import { SseBus } from "./streams/sse-bus.mjs";

const bus = new SseBus();
const aisService = new AisService({ config, bus });

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowedOrigin = config.cors.allowedOrigins.includes(origin) ? origin : config.cors.allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": origin ? allowedOrigin : "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function writeJson(req, res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    ...corsHeaders(req),
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function healthPayload() {
  const status = aisService.status();
  const active = status.active || {};
  return {
    ok: true,
    upstreamState: active.state || "idle",
    scope: active.scope || config.defaultScope,
    clients: bus.size,
    activeSource: status.activeSource,
    providers: status.providers,
    upstreamUrl: config.aisstream.upstreamUrl,
    allowInsecureTls: config.aisstream.allowInsecureTls,
    lastError: active.lastError || "",
    lastCloseCode: active.lastCloseCode ?? null,
    lastCloseReason: active.lastCloseReason || "",
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    writeJson(req, res, 200, healthPayload());
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      ...corsHeaders(req),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const active = aisService.status().active;
    const removeClient = bus.add(res, {
      kind: "status",
      state: active?.state || "idle",
      source: active?.source || null,
      scope: active?.scope || config.defaultScope,
    });
    req.on("close", removeClient);
    return;
  }

  if (req.method === "POST" && url.pathname === "/connect") {
    try {
      const body = await readJson(req);
      const scope = String(body.scope || config.defaultScope || "nc").trim();
      const source = String(body.source || config.defaultSource || "auto").trim();
      aisService.start({ source, scope });
      writeJson(req, res, 200, {
        ok: true,
        state: "connecting",
        source: aisService.status().activeSource,
        scope,
      });
    } catch (error) {
      writeJson(req, res, 400, {
        ok: false,
        error: "Connexion AIS impossible",
        message: error?.message || "Requete invalide",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/disconnect") {
    aisService.stop("manual");
    writeJson(req, res, 200, { ok: true });
    return;
  }

  writeJson(req, res, 404, { ok: false, error: "not found" });
});

server.listen(config.port, config.host, () => {
  console.log(`[AIS relay] listening on http://${config.host}:${config.port}`);
  console.log("[AIS relay] sources:", aisService.providerStatus().map((item) => item.source).join(", "));
});
