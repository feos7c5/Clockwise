import { DurableObject } from 'cloudflare:workers';

export class VaultChannel extends DurableObject {
  async fetch(request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'clockwise' } });
    }
    const { version } = await request.json();
    const message = JSON.stringify({ v: version });
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(message); } catch { }
    }
    return new Response(null, { status: 204 });
  }

  webSocketMessage(ws, message) {
    if (message === 'ping') ws.send('pong');
  }

  webSocketClose(ws, code) {
    try { ws.close(code, 'closed'); } catch { }
  }
}
