import { AisStreamProvider } from "./providers/aisstream-provider.mjs";
import { AisHubProvider } from "./providers/aishub-provider.mjs";
import { AisCatcherProvider } from "./providers/aiscatcher-provider.mjs";

export class AisService {
  constructor({ config, bus }) {
    this.config = config;
    this.bus = bus;
    this.activeProvider = null;
    this.providers = new Map();
    this.register(new AisStreamProvider({ config, bus }));
    this.register(new AisHubProvider({ config, bus }));
    this.register(new AisCatcherProvider({ config, bus }));
  }

  register(provider) {
    this.providers.set(provider.name, provider);
  }

  providerStatus() {
    return Array.from(this.providers.values()).map((provider) => provider.status());
  }

  status() {
    return {
      activeSource: this.activeProvider?.name || null,
      active: this.activeProvider?.status() || { source: null, state: "idle" },
      providers: this.providerStatus(),
    };
  }

  stop(reason = "manual") {
    if (this.activeProvider) {
      this.activeProvider.stop();
    }
    const source = this.activeProvider?.name || null;
    this.activeProvider = null;
    this.bus.broadcast({ kind: "status", state: "closed", source, reason });
  }

  selectProvider(requestedSource) {
    const source = requestedSource || this.config.defaultSource || "auto";
    if (source !== "auto") return this.providers.get(source);
    const aisstream = this.providers.get("aisstream");
    if (aisstream?.available) return aisstream;
    throw new Error("Aucune source AIS reelle n'est configuree. Renseigne AISSTREAM_API_KEY dans .env.");
  }

  start({ source, scope } = {}) {
    const provider = this.selectProvider(source);
    if (!provider) {
      throw new Error(`Source AIS inconnue: ${source}`);
    }

    this.stop("switch-source");
    this.activeProvider = provider;

    try {
      provider.start({ scope: scope || this.config.defaultScope || "nc" });
    } catch (error) {
      this.bus.broadcast({
        kind: "error",
        source: provider.name,
        message: error?.message || "Source AIS indisponible.",
      });
      this.activeProvider = null;
      throw error;
    }
  }
}
