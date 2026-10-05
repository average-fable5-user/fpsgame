/**
 * FPS, the kinda weird way — multiplayer relay (Cloudflare Worker + Durable Object).
 *
 * Deploy:  npx wrangler deploy        (wrangler.toml next to this file)
 * Client:  wss://<your-worker>.workers.dev/room/<code>?name=<callsign>&mode=tdm|ffa
 *
 * One Durable Object per room. Clients send their own state (position / aim / weapon / hp) ~15×/s;
 * the room rebroadcasts a snapshot 20×/s, relays shots and hits, keeps the scoreboard and ends the
 * match when a team / player reaches the target. Hit detection is shooter-authoritative (the shooting
 * client tells the room "I hit X for N"); the room forwards it to X, and X reports its own death.
 */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([\w-]{1,32})$/);
    if (!env.ROOMS) return new Response('Durable Object binding "ROOMS" is missing. Deploy with `npx wrangler deploy` from the folder that contains wrangler.toml (the dashboard editor does not create the binding/migration).', { status: 500, headers: { 'content-type': 'text/plain' } });
    if (!m) return new Response('fps relay ok — connect to /room/<code>', { status: 200, headers: { 'content-type': 'text/plain' } });
    const id = env.ROOMS.idFromName(m[1].toLowerCase());
    return env.ROOMS.get(id).fetch(req);
  },
};

const TARGET = { tdm: 40, ffa: 30 };

export class Room {
  constructor(state, env) {
    this.state = state; this.env = env;
    this.players = new Map();   // ws -> player record
    this.mode = null; this.scores = [0, 0]; this.over = false; this.nextId = 1; this.tick = null;
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const name = (url.searchParams.get('name') || 'OPERATOR').slice(0, 14).replace(/[<>&]/g, '');
    const mode = url.searchParams.get('mode') === 'ffa' ? 'ffa' : 'tdm';
    if (!this.mode || this.players.size === 0) { this.mode = mode; this.scores = [0, 0]; this.over = false; }
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    server.accept();
    const team = this.mode === 'ffa' ? (this.nextId % 2) : this.balanceTeam();
    const p = { id: this.nextId++, name, team, p: [0, 0, 0], ry: 0, rp: 0, cr: 0, hp: 100, w: 'ak', dead: 0, k: 0, d: 0, pl: 0, pi: -1, tk: 0, ti: -1, ws: server, lastSeen: Date.now() };
    this.players.set(server, p);
    const room = url.pathname.split('/').pop();
    server.send(JSON.stringify({ t: 'welcome', id: p.id, team: p.team, mode: this.mode, room, target: TARGET[this.mode], scores: this.scores, players: [...this.players.values()].map(this.pub) }));
    this.broadcast({ t: 'join', p: this.pub(p) }, server);
    server.addEventListener('message', ev => this.onMessage(p, ev.data));
    const bye = () => { if (!this.players.has(server)) return; this.players.delete(server); this.broadcast({ t: 'leave', id: p.id }); if (this.players.size === 0) this.stopTick(); };
    server.addEventListener('close', bye); server.addEventListener('error', bye);
    this.startTick();
    return new Response(null, { status: 101, webSocket: client });
  }

  pub = p => ({ id: p.id, name: p.name, team: p.team, p: p.p, ry: p.ry, rp: p.rp, cr: p.cr, hp: p.hp, w: p.w, dead: p.dead, k: p.k, d: p.d, pl: p.pl, pi: p.pi, tk: p.tk, ti: p.ti });
  balanceTeam() { let n = [0, 0]; for (const q of this.players.values()) n[q.team]++; return n[0] <= n[1] ? 0 : 1; }
  broadcast(obj, except) { const s = JSON.stringify(obj); for (const [ws] of this.players) if (ws !== except) { try { ws.send(s); } catch (e) {} } }
  sendTo(id, obj) { for (const q of this.players.values()) if (q.id === id) { try { q.ws.send(JSON.stringify(obj)); } catch (e) {} } }
  startTick() { if (this.tick) return; this.tick = setInterval(() => this.snapshot(), 50); }
  stopTick() { if (this.tick) clearInterval(this.tick); this.tick = null; }
  snapshot() {
    const now = Date.now();
    for (const [ws, q] of this.players) if (now - q.lastSeen > 15000) { try { ws.close(); } catch (e) {} this.players.delete(ws); this.broadcast({ t: 'leave', id: q.id }); }
    if (this.players.size === 0) return this.stopTick();
    this.broadcast({ t: 'state', players: [...this.players.values()].map(this.pub), scores: this.scores });
  }

  onMessage(p, raw) {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    p.lastSeen = Date.now();
    switch (m.t) {
      case 's': if (Array.isArray(m.p) && m.p.length === 3) p.p = m.p.map(v => +v || 0); p.ry = +m.ry || 0; p.rp = +m.rp || 0; p.cr = m.cr ? 1 : 0; p.hp = Math.max(0, Math.min(100, +m.hp || 0)); p.w = String(m.w || 'ak').slice(0, 8); p.dead = m.dead ? 1 : 0; p.pl = Array.isArray(m.pl) && m.pl.length >= 7 && m.pl.length <= 8 ? m.pl.map(v => +v || 0) : 0; p.pi = Number.isInteger(m.pi) ? m.pi : -1; p.tk = Array.isArray(m.tk) && m.tk.length === 9 ? m.tk.map(v => +v || 0) : 0; p.ti = Number.isInteger(m.ti) ? m.ti : -1; break;
      case 'shot': this.broadcast({ t: 'shot', id: p.id, o: m.o, p: m.p, w: m.w }, p.ws); break;
      case 'boom': if (Array.isArray(m.p) && m.p.length === 3) this.broadcast({ t: 'boom', id: p.id, p: m.p.map(v => +v || 0), big: m.big ? 1 : 0 }, p.ws); break;
      case 'hit': { const dmg = Math.max(0, Math.min(200, +m.dmg || 0)); for (const q of this.players.values()) if (q.id === m.to && !q.dead && (this.mode === 'ffa' || q.team !== p.team)) this.sendTo(q.id, { t: 'hit', from: p.id, dmg, hs: !!m.hs }); break; }
      case 'died': {
        if (this.over || Date.now() - (p.diedAt || 0) < 3000) break; p.diedAt = Date.now(); p.d++; p.dead = 1;   // one death per life
        let killer = null; for (const q of this.players.values()) if (q.id === m.by) killer = q;
        if (killer && killer !== p) { killer.k++; if (this.mode === 'tdm') this.scores[killer.team]++; }
        this.broadcast({ t: 'kill', killer: killer ? killer.id : null, victim: p.id, hs: !!m.hs, kt: killer ? killer.team : p.team, vt: p.team });
        const target = TARGET[this.mode];
        if (this.mode === 'tdm' && (this.scores[0] >= target || this.scores[1] >= target)) { this.over = true; this.broadcast({ t: 'end', winner: this.scores[0] >= target ? 0 : 1 }); setTimeout(() => this.reset(), 8000); }
        if (this.mode === 'ffa' && killer && killer.k >= target) { this.over = true; this.broadcast({ t: 'end', winner: killer.id }); setTimeout(() => this.reset(), 8000); }
        break;
      }
      case 'chat': this.broadcast({ t: 'chat', name: p.name, text: String(m.text || '').slice(0, 120) }); break;
    }
  }
  reset() { this.scores = [0, 0]; this.over = false; for (const q of this.players.values()) { q.k = 0; q.d = 0; q.dead = 0; } }
}
