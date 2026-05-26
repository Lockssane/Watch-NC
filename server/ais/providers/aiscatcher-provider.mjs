export class AisCatcherProvider {
  constructor({ config }) {
    this.config = config;
    this.state = "idle";
  }

  get name() {
    return "aiscatcher";
  }

  get available() {
    return false;
  }

  status() {
    return {
      source: this.name,
      state: this.state,
      available: false,
      planned: true,
      host: this.config.aiscatcher.host,
      port: this.config.aiscatcher.port,
      lastError: "Source locale AIS-catcher prevue pour flux NMEA TCP/UDP futur.",
    };
  }

  start() {
    throw new Error("Adaptateur AIS-catcher prevu pour une prochaine etape.");
  }

  stop() {
    this.state = "idle";
  }
}
