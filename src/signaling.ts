export type WSMessage = { type: string; [key: string]: any };

export class Signaling {
  ws: WebSocket;

  constructor() {
    const url = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${url}://${location.host}`);
  }

  send(msg: WSMessage) {
    this.ws.send(JSON.stringify(msg));
  }

  on(fn: (msg: WSMessage) => void) {
    this.ws.addEventListener('message', e => fn(JSON.parse(e.data)));
  }
}
