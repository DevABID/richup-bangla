// WebSocket with automatic reconnect (important on flaky mobile data).
export class GameSocket {
  constructor(url, onMessage, onStatus) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.retry = 0;
    this.closed = false;
    this.queue = [];
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      this.retry = 0;
      this.onStatus(true);
      this.queue.splice(0).forEach((m) => this.ws.send(m));
    };
    this.ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    this.ws.onclose = () => {
      this.onStatus(false);
      if (this.closed) return;
      const delay = Math.min(10000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  send(msg) {
    const data = JSON.stringify(msg);
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
    else if (msg.type !== "rtc") this.queue.push(data);
  }

  close() {
    this.closed = true;
    clearTimeout(this.timer);
    this.ws.close();
  }
}
