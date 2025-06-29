import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const TUTOR_PW = process.env.TUTOR_PW || 'secret123';

app.use(express.static('public'));
app.use(express.json());

app.post('/login', (req, res) => {
  res.json({ ok: req.body.password === TUTOR_PW });
});

wss.on('connection', ws => {
  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString());
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(msg));
      }
    });
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
