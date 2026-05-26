export class AisHubProvider {
  constructor({ config }) {
    this.config = config;
    this.state = "idle";
  }

  get name() {
    return "aishub";
  }

  get available() {
    return Boolean(this.config.aishub.apiKey && this.config.aishub.endpoint);
  }

  status() {
    return {
      source: this.name,
      state: this.state,
      available: this.available,
      planned: true,
      lastError: this.available
        ? "Adaptateur AISHub prevu mais non active dans cette premiere passe."
        : "AISHUB_API_KEY ou AISHUB_ENDPOINT manquant.",
    };
  }

  start() {
    throw new Error("Adaptateur AISHub prevu pour une prochaine etape.");
  }

  stop() {
    this.state = "idle";
  }
}
