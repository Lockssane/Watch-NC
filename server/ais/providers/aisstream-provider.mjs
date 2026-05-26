import WebSocket from "ws";
import { normalizeAisStreamMessage } from "../normalize-vessel.mjs";

export function aisBoundingBoxes(scope) {
  if (scope === "world") return [[[-90, -180], [90, 180]]];
  if (scope === "pacific") {
    return [
      [[-50, 120], [25, 180]],
      [[-50, -180], [25, -120]],
    ];
  }
  return [[[-26, 161], [-17, 171]]];
}

export class AisStreamProvider {
  constructor({ config, bus }) {
    this.config = config;
    this.bus = bus;
    this.socket = null;
    this.state = "idle";
    this.lastError = "";
    this.lastCloseCode = null;
    this.lastCloseReason = "";
    this.scope = config.defaultScope || "nc";
  }

  get name() {
    return "aisstream";
  }

  get available() {
    return Boolean(this.config.aisstream.apiKey);
  }

  status() {
    return {
      source: this.name,
      state: this.state,
      scope: this.scope,
      available: this.available,
      lastError: this.lastError,
      lastCloseCode: this.lastCloseCode,
      lastCloseReason: this.lastCloseReason,
      upstreamUrl: this.config.aisstream.upstreamUrl,
      allowInsecureTls: this.config.aisstream.allowInsecureTls,
    };
  }

  stop() {
    if (!this.socket) {
      this.state = "idle";
      return;
    }
    try {
      this.socket.close();
    } catch {
      // no-op
    }
    this.socket = null;
    this.state = "idle";
  }

  start({ scope }) {
    if (!this.available) {
      throw new Error("AISSTREAM_API_KEY absente dans .env. Impossible de lancer des pistes AIS reelles.");
    }

    this.stop();
    this.scope = scope || this.config.defaultScope || "nc";
    this.state = "connecting";
    this.lastError = "";
    this.lastCloseCode = null;
    this.lastCloseReason = "";
    this.bus.broadcast({ kind: "status", state: "connecting", source: this.name, scope: this.scope });

    this.socket = new WebSocket(this.config.aisstream.upstreamUrl, {
      rejectUnauthorized: !this.config.aisstream.allowInsecureTls,
    });

    this.socket.addEventListener("open", () => {
      this.socket.send(
        JSON.stringify({
          APIKey: this.config.aisstream.apiKey,
          BoundingBoxes: aisBoundingBoxes(this.scope),
          FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"],
        }),
      );
      this.state = "connected";
      this.bus.broadcast({ kind: "status", state: "connected", source: this.name, scope: this.scope });
    });

    this.socket.addEventListener("message", async (event) => {
      try {
        const raw = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
        const message = JSON.parse(raw);
        const normalized = normalizeAisStreamMessage(message, this.name);
        this.bus.broadcast({ kind: "ais", source: this.name, message, vessel: normalized });
      } catch (error) {
        this.bus.broadcast({ kind: "error", source: this.name, message: "Message AISStream invalide recu." });
      }
    });

    this.socket.addEventListener("error", () => {
      this.lastError = "Erreur de connexion au flux AISStream.";
      this.bus.broadcast({ kind: "error", source: this.name, message: this.lastError });
    });

    this.socket.addEventListener("close", (event) => {
      this.state = "idle";
      this.lastCloseCode = event.code ?? null;
      this.lastCloseReason = event.reason || "";
      this.socket = null;
      this.bus.broadcast({
        kind: "status",
        source: this.name,
        state: "closed",
        code: event.code,
        reason: event.reason || "",
      });
    });
  }
}
