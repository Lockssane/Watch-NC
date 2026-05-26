export class SseBus {
  constructor() {
    this.clients = new Set();
  }

  get size() {
    return this.clients.size;
  }

  add(res, initialPacket = null) {
    if (initialPacket) {
      res.write(`data: ${JSON.stringify(initialPacket)}\n\n`);
    }
    this.clients.add(res);
    return () => this.clients.delete(res);
  }

  broadcast(packet) {
    const raw = `data: ${JSON.stringify(packet)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(raw);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
