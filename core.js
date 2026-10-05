/* core.js — engine side: utils, settings, audio, renderer, terrain, collision, particles, model loading, world dressing. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { THREE };

// =====================================================================
// CONSTANTS / UTILS
// =====================================================================
export const MAP = 240, GRID = 180, STEP = 2 * MAP / GRID;
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const $ = id => document.getElementById(id);
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
export function lerpAngle(a, b, t) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
export function hash(ix, iz) { let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
function vnoise(x, z) { const ix = Math.floor(x), iz = Math.floor(z), u = smooth(x - ix), v = smooth(z - iz); const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function fbm(x, z, oct = 4) { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); t += a; a *= 0.5; f *= 2.1; } return s / t; }
// deterministic world generation: every client must build the identical map (terrain, craters, trees, props) for multiplayer
const _nativeRandom = Math.random;
export function seedWorld(seed) { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function unseedWorld() { Math.random = _nativeRandom; }
seedWorld(20261005);
export function makeTex(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const softTex = makeTex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
export const sparkTex = makeTex(32, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
export const flashTex = makeTex(128, (g, s) => { g.translate(s / 2, s / 2); const r = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.3, 'rgba(255,170,60,.6)'); r.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = r; g.fillRect(-s / 2, -s / 2, s, s); g.fillStyle = 'rgba(255,230,160,.9)'; for (let i = 0; i < 7; i++) { g.rotate(Math.PI * 2 / 7); g.beginPath(); g.moveTo(0, -3); g.lineTo(s / 2, 0); g.lineTo(0, 3); g.fill(); } });
const grassTex = makeTex(64, (g, s) => { g.clearRect(0, 0, s, s); for (let i = 0; i < 9; i++) { const x = 4 + i * 7 + rand(-2, 2), w = rand(2, 4), h = rand(s * 0.45, s); const c = 60 + randi(0, 50); g.fillStyle = `rgb(${c - 20},${c + 30},${c - 35})`; g.beginPath(); g.moveTo(x - w, s); g.lineTo(x + rand(-4, 4), s - h); g.lineTo(x + w, s); g.fill(); } });

// =====================================================================
// PERSISTENCE
// =====================================================================
export const settings = Object.assign({ sens: 1, fov: 75, vol: 0.7, crouch: 'toggle', shadow: 'high', primary: 'ak', secondary: 'pistol', diff: 'medium', mode: 'survival',
  xhStyle: 'cross', xhColor: '#ffffff', xhSize: 1, xhGap: 1, xhDot: true, xhOutline: true, xhDynamic: true, name: 'OPERATOR', server: '', room: 'alpha', netMode: 'tdm' }, JSON.parse(localStorage.getItem('fpskw_settings') || '{}'));
export const career = Object.assign({ xp: 0, kills: 0, hs: 0, matches: 0, bestWave: 0, bestScore: 0, wins: 0 }, JSON.parse(localStorage.getItem('fpskw_career') || '{}'));
const DEFAULT_SERVER = (window.FPS_CONFIG && window.FPS_CONFIG.server) || '';
if (!settings.server) settings.server = DEFAULT_SERVER;
export const saveSettings = () => localStorage.setItem('fpskw_settings', JSON.stringify(settings));
export const saveCareer = () => localStorage.setItem('fpskw_career', JSON.stringify(career));

// =====================================================================
// AUDIO — fully synthesized, with reverb, distance filtering and layering
// =====================================================================
class Sfx {
  constructor() { this.ctx = null; this.stepT = 0; }
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = this.ctx = new C(), sr = c.sampleRate;
    this.master = c.createGain(); this.master.gain.value = settings.vol;
    this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 6; this.comp.attack.value = 0.002; this.comp.release.value = 0.15;
    this.master.connect(this.comp); this.comp.connect(c.destination);
    const noiseBuf = (len, brown) => { const b = c.createBuffer(1, len, sr), d = b.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; };
    this.noise = noiseBuf(sr * 2, false); this.brown = noiseBuf(sr * 2, true);
    // reverb: exponentially decaying stereo noise, 1.6 s (forest / valley)
    const ir = c.createBuffer(2, sr * 1.6, sr); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6) * (i < sr * 0.02 ? i / (sr * 0.02) : 1); }
    this.verb = c.createConvolver(); this.verb.buffer = ir; this.verbGain = c.createGain(); this.verbGain.gain.value = 0.35; this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
    // wind bed + occasional distant rumble
    const w = c.createBufferSource(); w.buffer = this.brown; w.loop = true; const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 300; const wg = c.createGain(); wg.gain.value = 0.14;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 0.06; lfo.connect(lg); lg.connect(wg.gain); lfo.start();
    w.connect(wf); wf.connect(wg); wg.connect(this.master); w.start();
    this.rumbleT = 4;
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  setVol(v) { if (this.master) this.master.gain.value = v; }
  _out(pan, verb, dist) { const c = this.ctx, g = c.createGain(), p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.master); if (verb > 0) { const s = c.createGain(); s.gain.value = verb; p.connect(s); s.connect(this.verb); } return g; }
  _noise(buf, { t = 0, dur = 0.1, type = 'lowpass', freq = 1000, q = 0.8, gain = 1, attack = 0.002, pan = 0, rate = 1, verb = 0, decay = 'exp' } = {}) {
    const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.loopStart = Math.random() * 1.5;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this._out(pan, verb), t0 = c.currentTime + t;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack); if (decay === 'lin') g.gain.linearRampToValueAtTime(0.0001, t0 + dur); else g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    s.connect(f); f.connect(g); s.start(t0, s.loopStart); s.stop(t0 + dur + 0.05);
  }
  _tone({ t = 0, dur = 0.1, freq = 200, freqEnd = 0, type = 'sine', gain = 0.5, pan = 0, verb = 0, attack = 0.002 } = {}) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(); o.type = type; const t0 = c.currentTime + t;
    o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = this._out(pan, verb); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
    o.connect(g); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // kind: pistol | ak | ar | sniper ; dist in metres ; pan -1..1
  shot(kind, dist = 0, pan = 0, suppressedTail = false) {
    if (!this.ctx) return;
    const far = clamp(dist / 90, 0, 1), v = 1 / (1 + dist / 16), lp = lerp(9000, 500, far), verb = 0.25 + far * 0.6;
    const P = { pistol: { body: 2200, bdur: 0.09, thump: 170, tdur: 0.1, g: 0.9, crack: 0.5 }, ak: { body: 1400, bdur: 0.14, thump: 120, tdur: 0.16, g: 1.1, crack: 0.7 }, ar: { body: 1900, bdur: 0.11, thump: 140, tdur: 0.13, g: 1.0, crack: 0.65 }, sniper: { body: 700, bdur: 0.32, thump: 70, tdur: 0.4, g: 1.5, crack: 1.0 } }[kind] || { body: 1500, bdur: 0.12, thump: 130, tdur: 0.14, g: 1, crack: 0.6 };
    // 1) crack transient  2) body  3) low thump  4) tail (far = echo)
    if (dist < 60) this._noise(this.noise, { dur: 0.012, type: 'highpass', freq: 3000, gain: P.crack * v * 1.4, attack: 0.0005, pan });
    this._noise(this.noise, { dur: P.bdur * (1 + far), type: 'lowpass', freq: Math.min(P.body, lp), q: 0.7, gain: P.g * v, attack: 0.002, pan, verb });
    this._tone({ dur: P.tdur, freq: P.thump, freqEnd: 35, gain: 0.7 * P.g * v, pan, verb: verb * 0.5 });
    if (far > 0.2 || kind === 'sniper') this._noise(this.brown, { dur: 0.5 + far * 0.8, type: 'lowpass', freq: 400, gain: 0.35 * P.g * v * (0.4 + far), attack: 0.03, pan, verb: 0.9 });
  }
  explosion(dist, big) { const v = 1 / (1 + dist / 45), far = clamp(dist / 140, 0, 1); this._noise(this.noise, { dur: 0.05, type: 'highpass', freq: 1500, gain: 1.2 * v * (1 - far), attack: 0.001 }); this._noise(this.brown, { dur: big ? 2.6 : 1.6, freq: lerp(900, 150, far), gain: (big ? 2.2 : 1.4) * v, attack: 0.015, verb: 0.9 }); this._tone({ dur: 1.4, freq: 60, freqEnd: 24, gain: 1.1 * v, type: 'sine' }); }
  tankShot(dist, pan) { const v = 1 / (1 + dist / 40); this._noise(this.noise, { dur: 0.03, type: 'highpass', freq: 2000, gain: 0.9 * v, pan }); this._noise(this.brown, { dur: 0.9, freq: 700, gain: 1.6 * v, pan, verb: 0.8 }); this._tone({ dur: 0.8, freq: 90, freqEnd: 30, gain: 1.0 * v, pan }); }
  click(kind = 'mag', t = 0, pan = 0) {
    const K = { mag: { f: 1800, d: 0.05, g: 0.5 }, magin: { f: 900, d: 0.07, g: 0.6 }, bolt: { f: 3200, d: 0.04, g: 0.55 }, slide: { f: 2400, d: 0.06, g: 0.5 }, empty: { f: 2600, d: 0.03, g: 0.3 } }[kind];
    this._noise(this.noise, { t, dur: K.d, type: 'bandpass', freq: K.f, q: 3, gain: K.g, pan }); this._tone({ t, dur: K.d * 1.5, freq: K.f * 0.3, freqEnd: K.f * 0.12, type: 'triangle', gain: K.g * 0.3, pan });
  }
  reload(kind) { const seq = { pistol: [['mag', 0.5], ['magin', 1.6], ['slide', 2.9]], ak: [['mag', 0.4], ['magin', 1.6], ['bolt', 2.5]], ar: [['mag', 0.3], ['magin', 1.3], ['bolt', 1.9]], sniper: [['bolt', 0.2], ['mag', 1.4], ['magin', 2.5], ['bolt', 3.2]] }[kind] || [['mag', 0.3], ['magin', 1.2]]; for (const [k, t] of seq) this.click(k, t); }
  boltCycle(t = 0) { this.click('bolt', t); this.click('bolt', t + 0.35); }
  hit(hs) { this._tone({ dur: 0.05, freq: hs ? 2100 : 1500, freqEnd: hs ? 1700 : 1100, gain: 0.22, type: 'square' }); if (hs) this._tone({ dur: 0.09, freq: 2600, freqEnd: 2200, gain: 0.12, type: 'sine', t: 0.03 }); }
  kill() { this._tone({ dur: 0.08, freq: 880, gain: 0.18, type: 'triangle' }); this._tone({ t: 0.07, dur: 0.14, freq: 1320, gain: 0.18, type: 'triangle' }); }
  hurt() { this._tone({ dur: 0.28, freq: 110, freqEnd: 40, gain: 0.8 }); this._noise(this.noise, { dur: 0.18, freq: 500, gain: 0.5 }); }
  whizz(pan) { this._noise(this.noise, { dur: 0.14, type: 'bandpass', freq: rand(2500, 4000), q: 8, gain: 0.4, pan, rate: 1.6 }); }
  ricochet(pan) { this._tone({ dur: 0.25, freq: rand(2500, 4000), freqEnd: 600, gain: 0.12, type: 'sine', pan, verb: 0.4 }); }
  whistle(dur) { this._tone({ dur, freq: 1700, freqEnd: 280, gain: 0.13, type: 'triangle', verb: 0.3 }); }
  jet(dist, pan) { const v = 1 / (1 + dist / 60); this._noise(this.brown, { dur: 3, freq: 1200, gain: 0.6 * v, attack: 1.0, pan, decay: 'lin' }); }
  step(sprint, crouch) { const g = crouch ? 0.08 : sprint ? 0.3 : 0.18; this._noise(this.noise, { dur: sprint ? 0.09 : 0.12, type: 'lowpass', freq: rand(500, 900), gain: g, attack: 0.004 }); this._noise(this.brown, { dur: 0.06, freq: 300, gain: g * 0.8, attack: 0.002 }); }
  ui(kind = 'click') { if (kind === 'hover') this._tone({ dur: 0.04, freq: 1400, gain: 0.05, type: 'sine' }); else if (kind === 'back') this._tone({ dur: 0.08, freq: 600, freqEnd: 400, gain: 0.1, type: 'triangle' }); else { this._tone({ dur: 0.05, freq: 900, freqEnd: 1300, gain: 0.1, type: 'triangle' }); this._tone({ t: 0.04, dur: 0.05, freq: 1800, gain: 0.06, type: 'sine' }); } }
  jingle(kind) {
    const seq = { good: [[660, 0], [880, 0.12], [1320, 0.24]], bad: [[520, 0], [390, 0.14], [260, 0.3]], flag: [[784, 0], [988, 0.1], [1175, 0.2], [1568, 0.32]], wave: [[196, 0], [196, 0.25], [262, 0.5]], win: [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.5]], lose: [[392, 0], [349, 0.2], [311, 0.4], [262, 0.7]] }[kind];
    for (const [f, t] of seq) this._tone({ t, dur: kind === 'wave' ? 0.5 : 0.28, freq: f, gain: 0.16, type: kind === 'wave' ? 'sawtooth' : 'triangle', verb: 0.5, attack: 0.01 });
  }
  countdown(last) { this._tone({ dur: 0.12, freq: last ? 1200 : 800, gain: 0.14, type: 'square' }); }
  update(dt) { if (!this.ctx) return; this.rumbleT -= dt; if (this.rumbleT <= 0) { this.rumbleT = rand(6, 18); this._noise(this.brown, { dur: rand(1.5, 3), freq: 120, gain: rand(0.15, 0.4), attack: 0.4, pan: rand(-0.8, 0.8), verb: 1 }); if (Math.random() < 0.5) { const n = randi(3, 9), pan = rand(-0.9, 0.9); for (let i = 0; i < n; i++) this._noise(this.noise, { t: i * rand(0.08, 0.14), dur: 0.25, freq: 450, gain: 0.08, pan, verb: 1 }); } } }
}
export const sfx = new Sfx();

// =====================================================================
// RENDERER / SCENE
// =====================================================================
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = settings.shadow !== 'off'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.domElement.className = 'gl';
document.body.appendChild(renderer.domElement);
export const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0xb3977a, 0.0042);
export const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.03, 1500); camera.rotation.order = 'YXZ'; scene.add(camera);
export const sunDir = V3(0.45, 0.32, 0.55).normalize();
export const sun = new THREE.DirectionalLight(0xffd6a8, 3.2);
sun.castShadow = true; const sm = settings.shadow === 'low' ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 320 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6; sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target); scene.add(new THREE.HemisphereLight(0x9fb4d6, 0x5a4f3e, 2.2));
export const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
  uniforms: { sunDir: { value: sunDir }, top: { value: new THREE.Color(0x4f6688) }, horizon: { value: new THREE.Color(0xc8a37c) }, ground: { value: new THREE.Color(0x6e5a48) } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 sunDir, top, horizon, ground; varying vec3 vDir; void main(){ float y = vDir.y; vec3 col = mix(horizon, top, smoothstep(0.0, 0.45, y)); if (y < 0.0) col = mix(horizon, ground, smoothstep(0.0, -0.25, y)); float s = max(dot(vDir, sunDir), 0.0); col += vec3(1.0, 0.55, 0.25) * pow(s, 6.0) * 0.55 + vec3(1.0, 0.9, 0.7) * pow(s, 600.0) * 5.0; col = mix(col, vec3(0.45, 0.4, 0.36), smoothstep(0.35, 0.0, abs(y)) * 0.35); gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` }));
sky.frustumCulled = false; scene.add(sky);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }

// =====================================================================
// TERRAIN
// =====================================================================
export const CRATERS = []; for (let i = 0; i < 26; i++) CRATERS.push({ x: rand(-MAP + 20, MAP - 20), z: rand(-MAP + 20, MAP - 20), r: rand(4, 9), d: rand(1.5, 4) });
function terrainH(x, z) {
  let h = (fbm(x * 0.011 + 13.7, z * 0.011 + 7.1, 4) - 0.5) * 28 + (fbm(x * 0.07, z * 0.07, 2) - 0.5) * 2.2;
  const dc = Math.hypot(x, z); h *= 0.3 + 0.7 * smooth(clamp((dc - 8) / 30, 0, 1));
  for (const c of CRATERS) { const d = Math.hypot(x - c.x, z - c.z), t = d / c.r; if (t < 1) h -= c.d * (1 - t * t); else if (t < 1.45) h += c.d * 0.28 * Math.sin((t - 1) / 0.45 * Math.PI); }
  return h;
}
export const HF = new Float32Array((GRID + 1) * (GRID + 1));
for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) HF[j * (GRID + 1) + i] = terrainH(-MAP + i * STEP, -MAP + j * STEP);
export function getH(x, z) { const fx = clamp((x + MAP) / STEP, 0, GRID - 0.0001), fz = clamp((z + MAP) / STEP, 0, GRID - 0.0001); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * (GRID + 1) + i; return (HF[k] * (1 - u) + HF[k + 1] * u) * (1 - v) + (HF[k + GRID + 1] * (1 - u) + HF[k + GRID + 2] * u) * v; }
export function slopeAt(x, z) { return Math.hypot(getH(x + 1, z) - getH(x - 1, z), getH(x, z + 1) - getH(x, z - 1)) / 2; }
export const mapImg = document.createElement('canvas'); mapImg.width = mapImg.height = 240;
export let terrain = null;
export function paintTerrain(textured) {
  const geo = terrain.geometry, col = geo.attributes.color.array;
  const P = textured ? { grass: 0xd8d8d0, grass2: 0xf0e6c0, dirt: 0x9a8064, scorched: 0x35302c, rock: 0xa09c94 } : { grass: 0x44602c, grass2: 0x6a7a30, dirt: 0x5c4a35, scorched: 0x2a2522, rock: 0x6f6c66 };
  const grass = new THREE.Color(P.grass), grass2 = new THREE.Color(P.grass2), dirt = new THREE.Color(P.dirt), scorched = new THREE.Color(P.scorched), rock = new THREE.Color(P.rock), tmp = new THREE.Color();
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
    const k = j * (GRID + 1) + i, x = -MAP + i * STEP, z = -MAP + j * STEP, n = fbm(x * 0.05 + 3, z * 0.05 + 9, 3), n2 = fbm(x * 0.3, z * 0.3, 2);
    tmp.copy(grass).lerp(grass2, clamp((n2 - 0.4) * 2.5, 0, 1)).lerp(dirt, clamp((n - 0.4) * 3, 0, 1)).lerp(rock, clamp((slopeAt(x, z) - 0.55) * 2.5, 0, 1));
    for (const c of CRATERS) { const d = Math.hypot(x - c.x, z - c.z); if (d < c.r * 1.6) tmp.lerp(scorched, clamp(1 - d / (c.r * 1.6), 0, 1) * 0.9); }
    const jit = 0.9 + hash(i, j) * 0.2; col[k * 3] = tmp.r * jit; col[k * 3 + 1] = tmp.g * jit; col[k * 3 + 2] = tmp.b * jit;
  }
  geo.attributes.color.needsUpdate = true;
}
{
  const geo = new THREE.PlaneGeometry(2 * MAP, 2 * MAP, GRID, GRID), pos = geo.attributes.position;
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) { const k = j * (GRID + 1) + i; pos.setXYZ(k, -MAP + i * STEP, HF[k], -MAP + j * STEP); }
  const mg = mapImg.getContext('2d'), id = mg.createImageData(240, 240);
  for (let py = 0; py < 240; py++) for (let px = 0; px < 240; px++) { const h = getH(-MAP + px * 2, -MAP + py * 2), sh = clamp(0.55 + h / 30, 0.25, 0.95), o = (py * 240 + px) * 4; id.data[o] = 52 * sh; id.data[o + 1] = 72 * sh; id.data[o + 2] = 78 * sh; id.data[o + 3] = 255; }
  mg.putImageData(id, 0, 0);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3)); geo.computeVertexNormals();
  terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); terrain.receiveShadow = true; scene.add(terrain); paintTerrain(false);
}

// =====================================================================
// OBSTACLES / COLLISION / LOS
// =====================================================================
export const obstacles = [], CELL = 12, GN = Math.ceil(2 * MAP / CELL) + 1, grid = [];
for (let i = 0; i < GN * GN; i++) grid.push([]);
export function addObs(x, z, r, h) { const o = { x, z, r, h, y: getH(x, z) }; obstacles.push(o); grid[clamp(((z + MAP) / CELL) | 0, 0, GN - 1) * GN + clamp(((x + MAP) / CELL) | 0, 0, GN - 1)].push(o); return o; }
const _q = [];
export function obsBox(x0, z0, x1, z1) {
  _q.length = 0; const gx0 = clamp(((x0 + MAP) / CELL) | 0, 0, GN - 1), gx1 = clamp(((x1 + MAP) / CELL) | 0, 0, GN - 1), gz0 = clamp(((z0 + MAP) / CELL) | 0, 0, GN - 1), gz1 = clamp(((z1 + MAP) / CELL) | 0, 0, GN - 1);
  for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) { const c = grid[gz * GN + gx]; for (let i = 0; i < c.length; i++) _q.push(c[i]); }
  return _q;
}
export function freeSpot(x, z, r) { for (const o of obsBox(x - r - 5, z - r - 5, x + r + 5, z + r + 5)) if (Math.hypot(x - o.x, z - o.z) < o.r + r) return false; return true; }
export function resolveCollision(p, r) {
  for (const o of obsBox(p.x - r - 5, p.z - r - 5, p.x + r + 5, p.z + r + 5)) { if (p.y > o.y + o.h) continue; const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), want = o.r + r; if (d < want) { const push = (want - d) / (d || 1); p.x += dx * push || want; p.z += dz * push; } }
  p.x = clamp(p.x, -MAP + 3, MAP - 3); p.z = clamp(p.z, -MAP + 3, MAP - 3);
}
export function losClear(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dz * dz, L = Math.sqrt(L2), steps = clamp((L / 2) | 0, 4, 48);
  for (let i = 1; i < steps; i++) { const t = i / steps; if (getH(a.x + dx * t, a.z + dz * t) > a.y + dy * t - 0.15) return false; }
  for (const o of obsBox(Math.min(a.x, b.x) - 5, Math.min(a.z, b.z) - 5, Math.max(a.x, b.x) + 5, Math.max(a.z, b.z) + 5)) { const t = clamp(((o.x - a.x) * dx + (o.z - a.z) * dz) / (L2 || 1), 0, 1), px = a.x + dx * t - o.x, pz = a.z + dz * t - o.z; if (px * px + pz * pz < o.r * o.r && a.y + dy * t < o.y + o.h) return false; }
  return true;
}
export function rayTerrain(o, d, maxD) {
  let t = 0, h = o.y - getH(o.x, o.z); if (h < 0) return 0;
  while (t < maxD) { const step = clamp(h * 0.6 + 0.3, 0.4, 3); t += step; const x = o.x + d.x * t, z = o.z + d.z * t; if (Math.abs(x) > MAP || Math.abs(z) > MAP) return Infinity; h = o.y + d.y * t - getH(x, z);
    if (h < 0) { let lo = t - step, hi = t; for (let k = 0; k < 6; k++) { const m = (lo + hi) / 2; if (o.y + d.y * m - getH(o.x + d.x * m, o.z + d.z * m) < 0) hi = m; else lo = m; } return hi; } }
  return Infinity;
}
export function rayTrees(o, d, maxD) {
  const a = d.x * d.x + d.z * d.z; if (a < 1e-6) return Infinity; let best = Infinity; const seen = new Set();
  for (let t = 0; t <= maxD + CELL && t < best + CELL; t += CELL) { const x = o.x + d.x * t, z = o.z + d.z * t;
    for (const ob of obsBox(x - CELL, z - CELL, x + CELL, z + CELL)) { if (!ob.tree || seen.has(ob)) continue; seen.add(ob); const fx = o.x - ob.x, fz = o.z - ob.z, b = fx * d.x + fz * d.z, c = fx * fx + fz * fz - ob.r * ob.r, disc = b * b - a * c; if (disc < 0) continue; const th = (-b - Math.sqrt(disc)) / a; if (th <= 0.05 || th >= best || th > maxD) continue; const y = o.y + d.y * th; if (y < ob.y - 0.5 || y > ob.y + ob.h) continue; best = th; } }
  return best;
}

// =====================================================================
// PARTICLES / TRACERS / LIGHTS
// =====================================================================
const partVert = `attribute float size; attribute float alpha; attribute vec3 col; varying float vA; varying vec3 vC; varying float vFog; uniform float fogDensity, uPR;
  void main(){ vA = alpha; vC = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z; gl_PointSize = size * uPR * (420.0 / max(d, 0.1)); gl_Position = projectionMatrix * mv; vFog = 1.0 - exp(-fogDensity * fogDensity * d * d); }`;
const partFrag = `uniform sampler2D map; uniform vec3 fogColor; uniform float uAdd; varying float vA; varying vec3 vC; varying float vFog;
  void main(){ float a = texture2D(map, gl_PointCoord).a; vec3 c = mix(mix(vC, fogColor, vFog), vC * (1.0 - vFog), uAdd); gl_FragColor = vec4(c, a * vA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
export class Particles {
  constructor(max, tex, additive) {
    this.max = max; this.n = 0; this.additive = additive;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.col = new Float32Array(max * 3); this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry(); this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aSize = new THREE.BufferAttribute(new Float32Array(max), 1); this.aAlpha = new THREE.BufferAttribute(new Float32Array(max), 1); this.aCol = new THREE.BufferAttribute(this.col, 3);
    for (const a of [this.aPos, this.aSize, this.aAlpha, this.aCol]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('size', this.aSize); g.setAttribute('alpha', this.aAlpha); g.setAttribute('col', this.aCol); g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, fogColor: { value: scene.fog.color }, fogDensity: { value: scene.fog.density }, uPR: { value: renderer.getPixelRatio() }, uAdd: { value: additive ? 1 : 0 } }, vertexShader: partVert, fragmentShader: partFrag, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, life, s0, s1, r, g, b, alpha = 1, drag = 0, grav = 0) { if (this.n >= this.max) return; const i = this.n++, i3 = i * 3; this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z; this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz; this.life[i] = this.maxLife[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b; this.a0[i] = alpha; this.drag[i] = drag; this.grav[i] = grav; }
  update(dt) {
    const sz = this.aSize.array, al = this.aAlpha.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { const j = --this.n; if (i !== j) { for (const arr of [this.pos, this.vel, this.col]) { arr[i * 3] = arr[j * 3]; arr[i * 3 + 1] = arr[j * 3 + 1]; arr[i * 3 + 2] = arr[j * 3 + 2]; } for (const arr of [this.life, this.maxLife, this.s0, this.s1, this.a0, this.drag, this.grav]) arr[i] = arr[j]; } i--; continue; }
      const i3 = i * 3, dr = 1 - this.drag[i] * dt; this.vel[i3 + 1] -= this.grav[i] * dt; this.vel[i3] *= dr; this.vel[i3 + 1] *= dr; this.vel[i3 + 2] *= dr; this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i]; sz[i] = lerp(this.s0[i], this.s1[i], t); al[i] = this.a0[i] * (this.additive ? (1 - t) * (1 - t) : (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9));
    }
    this.aPos.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = this.aCol.needsUpdate = true; this.points.geometry.setDrawRange(0, this.n);
  }
}
export const sparks = new Particles(2500, sparkTex, true), smoke = new Particles(3000, softTex, false);
export function puffSmoke(p, n, s0, s1, col = 0.25, life = [1.5, 3], spread = 1, up = 1.5, alpha = 0.5) { for (let i = 0; i < n; i++) { const c = col * rand(0.7, 1.3); smoke.spawn(p.x + rand(-spread, spread) * 0.3, p.y + rand(0, 0.3), p.z + rand(-spread, spread) * 0.3, rand(-1, 1) * spread, rand(0.3, 1) * up, rand(-1, 1) * spread, rand(life[0], life[1]), s0, s1, c, c * 0.95, c * 0.9, alpha, 0.8, -0.1); } }
export function burst(p, n, speed, col, size = 0.25, life = 0.5, grav = 10) { for (let i = 0; i < n; i++) { const d = V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1)); sparks.spawn(p.x, p.y, p.z, d.x, d.y, d.z, life * rand(0.5, 1.2), size, size * 0.4, col[0], col[1], col[2], 1, 1.5, grav); } }
export const expLights = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xff9a40, 0, 60, 2); scene.add(l); expLights.push(l); }
export const fx = { shake: 0 };
const tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 4, 1); tracerGeo.rotateX(Math.PI / 2); tracerGeo.translate(0, 0, 0.5);
const tracers = [];
for (let i = 0; i < 64; i++) { const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); m.visible = false; m.frustumCulled = false; scene.add(m); tracers.push({ m, life: 0 }); }
export function tracer(a, b) { const it = tracers.find(t => t.life <= 0) || tracers[0]; it.m.position.copy(a); it.m.lookAt(b); it.m.scale.set(1, 1, Math.max(0.1, a.distanceTo(b))); it.m.visible = true; it.life = 0.08; }
export function updateFx(dt) { sparks.update(dt); smoke.update(dt); for (const tr of tracers) if (tr.life > 0) { tr.life -= dt; tr.m.material.opacity = clamp(tr.life / 0.08, 0, 1); if (tr.life <= 0) tr.m.visible = false; } for (const l of expLights) l.intensity *= Math.exp(-9 * dt); }
export function explodeFx(p, big) {
  const l = expLights.reduce((a, b) => (a.intensity < b.intensity ? a : b)); l.position.set(p.x, p.y + 2, p.z); l.intensity = big ? 2500 : 900;
  burst(p, big ? 70 : 35, big ? 26 : 16, [1, 0.6, 0.2], big ? 1.6 : 1, 0.8, 6); burst(p, big ? 50 : 25, big ? 22 : 12, [0.9, 0.3, 0.05], big ? 2.5 : 1.5, 0.4, 0);
  for (let i = 0; i < (big ? 45 : 25); i++) { const c = rand(0.08, 0.2); smoke.spawn(p.x + rand(-1, 1), p.y + rand(0, 2), p.z + rand(-1, 1), rand(-4, 4) * (big ? 1.5 : 1), rand(2, 9) * (big ? 1.4 : 1), rand(-4, 4) * (big ? 1.5 : 1), rand(2.5, 5.5), big ? 4 : 2.5, big ? 16 : 9, c, c * 0.95, c * 0.9, 0.75, 1.3, -0.4); }
  for (let i = 0; i < (big ? 50 : 25); i++) sparks.spawn(p.x, p.y + 0.5, p.z, rand(-12, 12), rand(6, 22), rand(-12, 12), rand(1, 2.5), 0.4, 0.3, 0.12, 0.09, 0.06, 1, 0.1, 20);
  const d = p.distanceTo(camera.position); sfx.explosion(d, big); fx.shake = Math.max(fx.shake, (big ? 1.6 : 0.8) / (1 + d / 20));
}
export function panFor(p) { const right = _c.set(1, 0, 0).applyQuaternion(camera.quaternion); const d = _b.copy(p).sub(camera.position).normalize(); return clamp(d.dot(right), -1, 1); }

// =====================================================================
// MODEL LOADING
// =====================================================================
const gltfLoader = new GLTFLoader();
export function loadModel(url, onProgress) { return new Promise((res, rej) => gltfLoader.load(url, g => res(g), e => onProgress && onProgress(e), e => rej(e))); }
export function setupTextures(root) { root.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) if (m[k]) m[k].anisotropy = 8; if (m.transparent && m.alphaTest === 0) { m.alphaTest = 0.5; m.transparent = false; } if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.6); m.envMapIntensity = 0.7; if (m.emissive && m.emissiveMap === null && m.emissiveIntensity > 0 && m.emissive.getHex() === 0) m.emissiveIntensity = 0; } } }); }
// world-baked {geo, mat, matName} parts from a loaded scene (used by the forest pipeline)
export function partsFromScene(root) { root.updateMatrixWorld(true); const out = []; root.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); out.push({ geo: g, mat: o.material, matName: o.material.name || '' }); }); return out; }
function components(geo) {
  const pos = geo.attributes.position.array, n = pos.length / 3, idx = geo.index ? geo.index.array : null, tri = idx ? idx.length / 3 : n / 3;
  const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }, union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; }, vi = (t, k) => idx ? idx[t * 3 + k] : t * 3 + k;
  for (let t = 0; t < tri; t++) { union(vi(t, 0), vi(t, 1)); union(vi(t, 0), vi(t, 2)); }
  const seen = new Map(); for (let i = 0; i < n; i++) { const k = ((pos[i * 3] * 1e4) | 0) + ',' + ((pos[i * 3 + 1] * 1e4) | 0) + ',' + ((pos[i * 3 + 2] * 1e4) | 0); const j = seen.get(k); if (j === undefined) seen.set(k, i); else union(i, j); }
  const groups = new Map(); for (let t = 0; t < tri; t++) { const r = find(vi(t, 0)); let g = groups.get(r); if (!g) groups.set(r, g = []); g.push(t); }
  return [...groups.values()];
}
function triCenter(geo, tris) { const pos = geo.attributes.position.array, idx = geo.index ? geo.index.array : null; let x = 0, y = 0, z = 0, minY = Infinity, c = 0; for (const t of tris) for (let k = 0; k < 3; k++) { const v = idx ? idx[t * 3 + k] : t * 3 + k; x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; minY = Math.min(minY, pos[v * 3 + 1]); c++; } return { x: x / c, y: y / c, z: z / c, minY }; }
function assembleAnchored(list, cx, cz) {
  let n = 0; for (const e of list) n += e.tris.length * 3;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), A = new Float32Array(n * 2); let o = 0;
  for (const { geo, tris, ax, az } of list) { const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv ? geo.attributes.uv.array : null, idx = geo.index ? geo.index.array : null;
    for (const t of tris) for (let k = 0; k < 3; k++, o++) { const v = idx ? idx[t * 3 + k] : t * 3 + k; P[o * 3] = pos[v * 3] - cx; P[o * 3 + 1] = pos[v * 3 + 1]; P[o * 3 + 2] = pos[v * 3 + 2] - cz; N[o * 3] = nor[v * 3]; N[o * 3 + 1] = nor[v * 3 + 1]; N[o * 3 + 2] = nor[v * 3 + 2]; if (uv) { U[o * 2] = uv[v * 2]; U[o * 2 + 1] = uv[v * 2 + 1]; } A[o * 2] = ax - cx; A[o * 2 + 1] = az - cz; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setAttribute('anchor', new THREE.BufferAttribute(A, 2)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); return g;
}
export function forestPatch(parts) {
  let floor = null; const fb = new THREE.Box3(), trunks = [], leaves = [], groups = new Map();
  for (const p of parts) {
    if (/Floor/i.test(p.matName)) { floor = p.mat.map; p.geo.computeBoundingBox(); fb.copy(p.geo.boundingBox); continue; }
    const add = (tris, ax, az) => { let g = groups.get(p.mat); if (!g) groups.set(p.mat, g = []); g.push({ geo: p.geo, tris, ax, az }); };
    for (const tris of components(p.geo)) { const c = triCenter(p.geo, tris); if (/Wood/i.test(p.matName)) { if (tris.length >= 10) trunks.push({ x: c.x, z: c.z }); add(tris, c.x, c.z); } else if (/Elka|sosna/i.test(p.matName)) leaves.push({ add, tris, c }); else add(tris, c.x, c.z); }
  }
  for (const l of leaves) { let best = null, bd = 1.3; for (const t of trunks) { const d = Math.hypot(l.c.x - t.x, l.c.z - t.z); if (d < bd) { bd = d; best = t; } } l.add(l.tris, best ? best.x : l.c.x, best ? best.z : l.c.z); }
  const cx = fb.isEmpty() ? 0 : (fb.min.x + fb.max.x) / 2, cz = fb.isEmpty() ? 0 : (fb.min.z + fb.max.z) / 2;
  return { groups: [...groups].map(([mat, list]) => ({ mat, geo: assembleAnchored(list, cx, cz) })), trunks: trunks.map(t => ({ x: t.x - cx, z: t.z - cz })), floor, size: fb.isEmpty() ? 16 : Math.max(fb.max.x - fb.min.x, fb.max.z - fb.min.z) };
}

// =====================================================================
// WORLD DRESSING
// =====================================================================
export const solids = new THREE.Group(); scene.add(solids);
export const emitters = [];
export const mats = { bark: new THREE.MeshStandardMaterial({ color: 0x4a3827, roughness: 1 }), leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), burnt: new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 1 }), rock: new THREE.MeshStandardMaterial({ color: 0x716d66, roughness: 0.95, flatShading: true }), sand: new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }), steel: new THREE.MeshStandardMaterial({ color: 0x3b3b38, roughness: 0.6, metalness: 0.7 }), concrete: new THREE.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.95 }), dark: new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.9 }) };
function mergeGeos(list) { const P = [], N = [], U = []; for (const g of list) { const ng = g.index ? g.toNonIndexed() : g; P.push(...ng.attributes.position.array); N.push(...ng.attributes.normal.array); if (ng.attributes.uv) U.push(...ng.attributes.uv.array); } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); if (U.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); return out; }
const _m4 = new THREE.Matrix4(), _pos = new THREE.Vector3(), _quat = new THREE.Quaternion(), _scl = new THREE.Vector3(), _col = new THREE.Color();
export function setInst(im, i, x, y, z, ry, sx, sy = sx, sz = sx, rx = 0, rz = 0) { _pos.set(x, y, z); _quat.setFromEuler(new THREE.Euler(rx, ry, rz)); _scl.set(sx, sy, sz); _m4.compose(_pos, _quat, _scl); im.setMatrixAt(i, _m4); }

export const tanks = [];
function buildTankProc(wrecked) {
  const g = new THREE.Group(), hullM = new THREE.MeshStandardMaterial({ color: wrecked ? 0x24221f : 0x4e5a3b, roughness: 0.85, metalness: 0.25 });
  const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; o.userData.metal = true; g.add(o); return o; };
  mk(new THREE.BoxGeometry(4.2, 1.1, 7), hullM, 0, 1.25, 0); const gl = mk(new THREE.BoxGeometry(4.2, 0.8, 1.6), hullM, 0, 1.45, 3.9); gl.rotation.x = 0.55;
  for (const s of [-1, 1]) { mk(new THREE.BoxGeometry(1.0, 1.25, 7.6), mats.dark, s * 2.3, 0.7, 0); for (let i = 0; i < 6; i++) { const w = mk(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12), mats.steel, s * 2.3, 0.55, -2.9 + i * 1.16); w.rotation.z = Math.PI / 2; } mk(new THREE.BoxGeometry(1.2, 0.2, 7.8), hullM, s * 2.3, 1.42, 0); }
  const turret = new THREE.Group(); turret.position.set(0, 1.8, -0.4); g.add(turret); const tur = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, 0.95, 14), hullM); tur.position.y = 0.47; tur.castShadow = true; tur.userData.metal = true; turret.add(tur);
  const bar = new THREE.Group(); bar.position.set(0, 0.55, 1.2); turret.add(bar); const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 4.6, 10), hullM); bm.rotation.x = Math.PI / 2; bm.position.z = 2.3; bm.castShadow = true; bm.userData.metal = true; bar.add(bm);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, 4.7); bar.add(muzzle);
  g.userData = { turret, bar, muzzle, wrecked, yawT: rand(-3, 3), fireT: rand(6, 14), proc: true };
  if (wrecked) { turret.rotation.y = rand(-1, 1); g.rotation.z = rand(-0.14, 0.14); }
  return g;
}
export const structures = [
  { t: 'tank', x: -18, z: -62, w: false, team: 0 }, { t: 'tank', x: 104, z: 50, w: false, team: 1 }, /* kept clear of the two runways (diagonal x = z) */ { t: 'tank', x: 38, z: -18, w: true }, { t: 'tank', x: -80, z: 40, w: true }, { t: 'tank', x: 20, z: 95, w: true }, { t: 'tank', x: -100, z: -72, w: false, team: 0 }, { t: 'tank', x: 100, z: 72, w: false, team: 1 },
  { t: 'bunker', x: -45, z: 20 }, { t: 'bunker', x: 60, z: -70 }, { t: 'bunker', x: -96, z: -96 }, { t: 'bunker', x: 96, z: 96 },
];
for (let i = 0; i < 9; i++) structures.push({ t: 'sandbags', x: rand(-150, 150), z: rand(-150, 150), a: rand(0, 6.3) });
for (let i = 0; i < 16; i++) structures.push({ t: 'hedgehog', x: rand(-160, 160), z: rand(-160, 160) });
export function buildStructures(tankModel) {
  for (const s of structures) {
    const y = getH(s.x, s.z);
    if (s.t === 'tank') {
      let t;
      if (tankModel) {
        t = tankModel.scene.clone(); t.traverse(o => { if (o.isMesh) { const n = o.material.name || ''; if (/floor|shadow|smoke/i.test(n)) o.visible = false; else { o.castShadow = o.receiveShadow = true; o.userData.metal = true; o.material = o.material.clone(); const m = o.material; m.roughness = Math.max(m.roughness, 0.7); m.metalness = Math.min(m.metalness, 0.25); m.envMapIntensity = 0.9; if (m.emissive) m.emissiveIntensity = /projector/i.test(n) ? 1.5 : 0.35; if (s.w) { m.color.multiplyScalar(0.3); m.emissiveIntensity = 0; } } } });
        t.scale.setScalar(1.15); const muzzle = new THREE.Object3D(); muzzle.position.set(-0.02, 1.52, 4.71); t.add(muzzle);
        t.userData = { muzzle, wrecked: s.w, fireT: rand(6, 14), proc: false, team: s.team };
        if (s.w) { t.rotation.z = rand(-0.12, 0.12); t.rotation.x = rand(-0.06, 0.06); }
      } else t = buildTankProc(s.w);
      t.position.set(s.x, y, s.z); t.rotation.y += rand(0, 6.3); solids.add(t); tanks.push(t); addObs(s.x, s.z, 4.4, 3.2);
      if (s.w) { emitters.push({ p: V3(s.x, y + 2.6, s.z), type: 'smoke', acc: 0, rate: 9 }); emitters.push({ p: V3(s.x + rand(-1, 1), y + 2.3, s.z + rand(-1, 1)), type: 'fire', acc: 0, rate: 40 }); }
    } else if (s.t === 'bunker') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 4.5), mats.concrete); b.position.set(s.x, y + 1.2, s.z); b.castShadow = b.receiveShadow = true; solids.add(b);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 0.3), mats.dark); slit.position.set(s.x, y + 2.0, s.z + 2.2); solids.add(slit); addObs(s.x, s.z, 3.6, 2.8);
    } else if (s.t === 'sandbags') {
      const bag = new THREE.CapsuleGeometry(0.28, 0.75, 4, 8); bag.rotateZ(Math.PI / 2);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 8; k++) { const ang = s.a + (k - 3.5) * 0.3 + (row % 2) * 0.15, r = 2.4, x = s.x + Math.cos(ang) * r, z = s.z + Math.sin(ang) * r; const m = new THREE.Mesh(bag, mats.sand); m.position.set(x, getH(x, z) + 0.28 + row * 0.5, z); m.rotation.y = -ang - Math.PI / 2; m.castShadow = m.receiveShadow = true; solids.add(m); if (row === 0 && k % 2 === 0) addObs(x, z, 0.75, 1.5); }
    } else if (s.t === 'hedgehog') {
      const hg = new THREE.Group(); hg.position.set(s.x, y + 0.6, s.z); const rots = [[Math.PI / 4, 0, 0], [-Math.PI / 4, Math.PI / 2, 0], [0, Math.PI / 4, Math.PI / 2]];
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.4), mats.steel); m.rotation.set(...rots[k]); m.castShadow = true; m.userData.metal = true; hg.add(m); }
      hg.rotation.y = rand(0, 6); solids.add(hg); addObs(s.x, s.z, 1.0, 1.4);
    }
  }
  { const N = 260, im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mats.rock, N); let n = 0; for (let tries = 0; tries < N * 4 && n < N; tries++) { const x = rand(-MAP + 5, MAP - 5), z = rand(-MAP + 5, MAP - 5), s = rand(0.5, 2.3); if (Math.hypot(x, z) < 10 || !freeSpot(x, z, s)) continue; setInst(im, n, x, getH(x, z) - s * 0.3, z, rand(0, 6), s * rand(0.8, 1.3), s * rand(0.5, 0.9), s * rand(0.8, 1.3), rand(-0.3, 0.3), rand(-0.3, 0.3)); addObs(x, z, s * 0.85, s * 0.7); n++; } im.count = n; im.castShadow = im.receiveShadow = true; solids.add(im); }
  { const N = 40, geo = new THREE.CylinderGeometry(0.3, 0.42, 7, 7); geo.rotateZ(Math.PI / 2); const im = new THREE.InstancedMesh(geo, mats.bark, N); let n = 0; for (let tries = 0; tries < N * 4 && n < N; tries++) { const x = rand(-MAP + 8, MAP - 8), z = rand(-MAP + 8, MAP - 8), a = rand(0, 6.3); if (Math.hypot(x, z) < 10 || !freeSpot(x, z, 3.5)) continue; setInst(im, n, x, getH(x, z) + 0.3, z, a, 1, 1, 1, rand(-0.1, 0.1)); for (let k = -1; k <= 1; k++) addObs(x + Math.cos(a) * k * 2.3, z - Math.sin(a) * k * 2.3, 0.55, 0.8); n++; } im.count = n; im.castShadow = im.receiveShadow = true; solids.add(im); }
}
export const uTime = { value: 0 };
{ // grass
  const N = 16000, g = new THREE.BufferGeometry(), P = [], U = [], Nn = [], I = [];
  const quad = rot => { const c = Math.cos(rot), s = Math.sin(rot), b = P.length / 3; P.push(-0.45 * c, 0, -0.45 * s, 0.45 * c, 0, 0.45 * s, 0.45 * c, 0.8, 0.45 * s, -0.45 * c, 0.8, -0.45 * s); U.push(0, 0, 1, 0, 1, 1, 0, 1); Nn.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  quad(0); quad(Math.PI / 2); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setIndex(I);
  const m = new THREE.MeshStandardMaterial({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, color: 0xb0b58a });
  m.onBeforeCompile = sh => { sh.uniforms.uTime = uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = sin(uTime * 1.6 + instanceMatrix[3][0] * 0.4 + instanceMatrix[3][2] * 0.3) * 0.12 * uv.y; transformed.x += sw; transformed.z += sw * 0.6;'); };
  const im = new THREE.InstancedMesh(g, m, N); let n = 0; const gc1 = new THREE.Color(0x8fa060), gc2 = new THREE.Color(0xa7903f);
  for (let tries = 0; tries < N * 2 && n < N; tries++) { const x = rand(-MAP, MAP), z = rand(-MAP, MAP); if (slopeAt(x, z) > 0.7 || fbm(x * 0.05 + 3, z * 0.05 + 9, 3) > 0.62) continue; setInst(im, n, x, getH(x, z), z, rand(0, 3), rand(0.7, 1.4), rand(0.7, 1.5), rand(0.7, 1.4)); im.setColorAt(n, _col.copy(gc1).lerp(gc2, Math.random()).multiplyScalar(rand(0.7, 1.1))); n++; }
  im.count = n; im.receiveShadow = true; scene.add(im);
}
for (let i = 0; i < 4; i++) { const c = CRATERS[i * 5], p = V3(c.x + rand(-2, 2), getH(c.x, c.z) + 0.2, c.z + rand(-2, 2)); emitters.push({ p, type: 'fire', acc: 0, rate: 30 }); emitters.push({ p: p.clone(), type: 'smoke', acc: 0, rate: 5 }); }
export const fireLights = []; for (let i = 0; i < 3; i++) { const e = emitters.filter(e => e.type === 'fire')[i]; const l = new THREE.PointLight(0xff7a20, 25, 18, 2); l.position.copy(e.p).add(V3(0, 1.2, 0)); scene.add(l); fireLights.push(l); }
const ash = (() => { const N = 500, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = rand(-25, 25); pos[i * 3 + 1] = rand(0, 12); pos[i * 3 + 2] = rand(-25, 25); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, color: 0xd8cdb8, transparent: true, opacity: 0.55, depthWrite: false })); p.frustumCulled = false; scene.add(p); return p; })();

// forest: full forest.glb diorama tiled over the map; procedural cones as fallback
export const FOREST_SCALE = 4.5;
export let forestCull = null;
export function buildForest(patch) {
  const spots = [];
  for (let tries = 0; tries < 7000 && spots.length < 1900; tries++) { const x = rand(-MAP + 4, MAP - 4), z = rand(-MAP + 4, MAP - 4); if (Math.hypot(x, z) < 14) continue; if (fbm(x * 0.018 + 50, z * 0.018 + 50, 3) < 0.43 || slopeAt(x, z) > 0.9 || !freeSpot(x, z, 1.4)) continue; if (forestClear.some(c => Math.hypot(x - c.x, z - c.z) < c.r)) continue; let nearCrater = false; for (const c of CRATERS) if (Math.hypot(x - c.x, z - c.z) < c.r * 2.6) { nearCrater = true; break; } spots.push({ x, z, y: getH(x, z), s: rand(0.75, 1.5), burnt: nearCrater || (!patch && Math.random() < 0.04) }); }
  const burntGeo = new THREE.CylinderGeometry(0.12, 0.42, 7, 6); burntGeo.translate(0, 3.5, 0); const burnt = new THREE.InstancedMesh(burntGeo, mats.burnt, 300); let nb = 0;
  for (const sp of spots.filter(s => s.burnt)) { if (nb >= 300) break; setInst(burnt, nb, sp.x, sp.y - 0.2, sp.z, rand(0, 6), sp.s, sp.s * rand(0.7, 1.1), sp.s, rand(-0.12, 0.12), rand(-0.12, 0.12)); addObs(sp.x, sp.z, 0.4 * sp.s, 7 * sp.s); nb++; }
  burnt.count = nb; burnt.castShadow = true; solids.add(burnt);
  if (patch) { buildGLBForest(patch); return 'forest.glb'; }
  const live = spots.filter(s => !s.burnt), trunkGeo = new THREE.CylinderGeometry(0.22, 0.48, 5.2, 7); trunkGeo.translate(0, 2.6, 0);
  const canopyGeo = mergeGeos([new THREE.ConeGeometry(2.4, 4.2, 8).translate(0, 5.6, 0), new THREE.ConeGeometry(1.9, 3.8, 8).translate(0, 7.6, 0), new THREE.ConeGeometry(1.25, 3.2, 8).translate(0, 9.6, 0)]);
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.bark, live.length), canopy = new THREE.InstancedMesh(canopyGeo, mats.leaf, live.length), c1 = new THREE.Color(0x2f5a24), c2 = new THREE.Color(0x6e7a2a), c3 = new THREE.Color(0x7a5a2a); let n = 0;
  for (const sp of live) { setInst(trunks, n, sp.x, sp.y - 0.25, sp.z, rand(0, 6), sp.s); setInst(canopy, n, sp.x, sp.y - 0.25, sp.z, rand(0, 6), sp.s * rand(0.85, 1.15), sp.s, sp.s * rand(0.85, 1.15)); _col.copy(c1).lerp(c2, Math.random() * 0.8); if (Math.random() < 0.12) _col.lerp(c3, rand(0.4, 0.9)); _col.multiplyScalar(rand(0.8, 1.1)); canopy.setColorAt(n, _col); addObs(sp.x, sp.z, 0.45 * sp.s, 5 * sp.s).tree = true; n++; }
  trunks.count = canopy.count = n; trunks.castShadow = canopy.castShadow = true; trunks.receiveShadow = canopy.receiveShadow = true; solids.add(trunks); scene.add(canopy);
  return 'procedural';
}
export const forestClear = [];   // extra clearings (bases, objectives) registered before buildForest
function buildGLBForest(patch) {
  const S = FOREST_SCALE, SP = patch.size * S * 0.97, NT = Math.ceil(2 * MAP / SP), MR = 240, mask = new Uint8Array(MR * MR);
  const clear = [{ x: 0, z: 4, r: 16 }].concat(structures.filter(s => s.t !== 'hedgehog').map(s => ({ x: s.x, z: s.z, r: s.t === 'tank' ? 9 : s.t === 'bunker' ? 8 : 5 })), forestClear);
  for (let py = 0; py < MR; py++) for (let px = 0; px < MR; px++) { const x = -MAP + (px + 0.5) * 2, z = -MAP + (py + 0.5) * 2; let ok = px > 1 && py > 1 && px < MR - 2 && py < MR - 2 && fbm(x * 0.018 + 50, z * 0.018 + 50, 3) > 0.36 && slopeAt(x, z) < 1.1; if (ok) for (const c of clear) if (Math.hypot(x - c.x, z - c.z) < c.r) { ok = false; break; } if (ok) for (const c of CRATERS) if (Math.hypot(x - c.x, z - c.z) < c.r * 1.9) { ok = false; break; } mask[py * MR + px] = ok ? 255 : 0; }
  const maskAt = (x, z) => mask[clamp(((z + MAP) / 2) | 0, 0, MR - 1) * MR + clamp(((x + MAP) / 2) | 0, 0, MR - 1)] > 0;
  const hTex = new THREE.DataTexture(HF, GRID + 1, GRID + 1, THREE.RedFormat, THREE.FloatType); hTex.needsUpdate = true; const mTex = new THREE.DataTexture(mask, MR, MR, THREE.RedFormat, THREE.UnsignedByteType); mTex.needsUpdate = true;
  const F = v => v.toFixed(4);
  const inject = sh => { sh.uniforms.uH = { value: hTex }; sh.uniforms.uMask = { value: mTex };
    sh.vertexShader = `attribute vec2 anchor; uniform sampler2D uH, uMask;
float fH(vec2 p) { vec2 f = clamp((p + ${F(MAP)}) / ${F(STEP)}, vec2(0.0), vec2(${F(GRID - 0.001)})); ivec2 i = ivec2(floor(f)); vec2 u = f - vec2(i); float a = texelFetch(uH, i, 0).r, b = texelFetch(uH, i + ivec2(1, 0), 0).r, c = texelFetch(uH, i + ivec2(0, 1), 0).r, d = texelFetch(uH, i + ivec2(1, 1), 0).r; return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 aw = instanceMatrix * vec4(anchor.x, 0.0, anchor.y, 1.0);
  if (texelFetch(uMask, clamp(ivec2((aw.xz + ${F(MAP)}) * 0.5), ivec2(0), ivec2(${MR - 1})), 0).r < 0.5) transformed = vec3(0.0);
  else transformed.y += (fH(aw.xz) - 0.15) / length(instanceMatrix[0].xyz);`); };
  const tiles = [];
  for (let iz = 0; iz < NT; iz++) for (let ix = 0; ix < NT; ix++) { const x = -MAP + SP * (ix + 0.5) + rand(-3, 3), z = -MAP + SP * (iz + 0.5) + rand(-3, 3); const m = new THREE.Matrix4().compose(V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), randi(0, 3) * Math.PI / 2), V3(S, S, S)); tiles.push({ m, c: V3(x, getH(x, z) + 10, z) }); for (const t of patch.trunks) { const w = V3(t.x, 0, t.z).applyMatrix4(m); if (maskAt(w.x, w.z)) addObs(w.x, w.z, 0.065 * S + 0.12, 1.83 * S).tree = true; } }
  const meshes = patch.groups.map(({ geo, mat }) => { const m2 = mat.clone(); m2.onBeforeCompile = inject; if (m2.transparent) { m2.transparent = false; m2.alphaTest = 0.5; } m2.side = THREE.DoubleSide; const im = new THREE.InstancedMesh(geo, m2, tiles.length); im.frustumCulled = false; im.receiveShadow = true; im.castShadow = /Wood/i.test(mat.name) || (/Elka|sosna/i.test(mat.name) && settings.shadow === 'high'); im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m2.map, alphaTest: 0.5 }); im.customDepthMaterial.onBeforeCompile = inject; scene.add(im); return im; });
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(), R = SP * 0.75 + 12;
  forestCull = () => { camera.updateMatrixWorld(); pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); let k = 0; for (const t of tiles) { sph.set(t.c, R); if (!frustum.intersectsSphere(sph) && t.c.distanceTo(camera.position) > R + 60) continue; for (const im of meshes) im.setMatrixAt(k, t.m); k++; } for (const im of meshes) { im.count = k; im.instanceMatrix.needsUpdate = true; } };
  forestCull();
  if (patch.floor) { const f = patch.floor, period = patch.size / 20 * S; f.wrapS = f.wrapT = THREE.RepeatWrapping; f.repeat.set(2 * MAP / period, 2 * MAP / period); f.anisotropy = renderer.capabilities.getMaxAnisotropy(); f.needsUpdate = true; terrain.material.map = f; terrain.material.needsUpdate = true; paintTerrain(true); }
}

// aircraft
export function buildJet(scale = 1) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x5c6670, roughness: 0.5, metalness: 0.6 }), mk = (geo, x, y, z, mat = m) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
  const f = mk(new THREE.CylinderGeometry(0.5, 0.35, 8, 12), 0, 0, 0); f.rotation.x = Math.PI / 2; const nose = mk(new THREE.ConeGeometry(0.5, 2.4, 12), 0, 0, 5.2); nose.rotation.x = Math.PI / 2;
  const cp = mk(new THREE.SphereGeometry(0.42, 10, 8), 0, 0.35, 1.8, new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.2, metalness: 0.8 })); cp.scale.set(1, 0.8, 2.2);
  const shape = new THREE.Shape([[-5.6, -3], [-5.6, -2.1], [-0.6, 1.4], [0.6, 1.4], [5.6, -2.1], [5.6, -3]].map(p => new THREE.Vector2(p[0], p[1]))); const wing = mk(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }), 0, -0.1, 0); wing.rotation.x = Math.PI / 2;
  const tail = mk(new THREE.BoxGeometry(0.12, 1.9, 2.0), 0, 0.9, -3.3); tail.rotation.x = -0.5; mk(new THREE.BoxGeometry(4.2, 0.1, 1.4), 0, 0.1, -3.6);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xff9040, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(1.3, 1.3, 1); glow.position.z = -4.1; g.add(glow);
  const ex = new THREE.Object3D(); ex.position.z = -4.3; g.add(ex); g.userData.exhaust = ex; g.scale.setScalar(scale); return g;
}
function buildBomber() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x4a5048, roughness: 0.6, metalness: 0.5 }), mk = (geo, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const f = mk(new THREE.CylinderGeometry(1.1, 0.7, 18, 14), 0, 0, 0); f.rotation.x = Math.PI / 2; const n = mk(new THREE.SphereGeometry(1.1, 12, 8), 0, 0, 9); n.scale.z = 1.6; mk(new THREE.BoxGeometry(26, 0.3, 4.2), 0, 0.2, 0.5); mk(new THREE.BoxGeometry(9, 0.2, 2.5), 0, 0.5, -8); mk(new THREE.BoxGeometry(0.2, 3, 3), 0, 1.8, -8.2);
  for (const x of [-9, -4.5, 4.5, 9]) { const e = mk(new THREE.CylinderGeometry(0.55, 0.55, 3, 10), x, -0.4, 1); e.rotation.x = Math.PI / 2; }
  return g;
}
const jets = []; for (let i = 0; i < 3; i++) { const j = buildJet(1.4); j.userData.f = { phase: i * 0.14, r: 210 + i * 12, h: 105 + i * 7, spd: 0.3 }; scene.add(j); jets.push(j); }
let bomberFactory = buildBomber;
export function setAmbientAircraft(jetFactory, bomberF) {   // swap the procedural ambient jets / bomber for loaded models
  if (jetFactory) for (let i = 0; i < jets.length; i++) { const old = jets[i], j = jetFactory(); j.userData.f = old.userData.f; if (!j.userData.exhaust) { const ex = new THREE.Object3D(); ex.position.z = -4; j.add(ex); j.userData.exhaust = ex; } scene.remove(old); scene.add(j); jets[i] = j; }
  if (bomberF) bomberFactory = bomberF;
}
let bomber = null, bomberT = 12, jetSoundT = 5, artT = 6; const bombs = [], bombGeo = new THREE.CylinderGeometry(0.28, 0.2, 1.4, 8); bombGeo.rotateX(Math.PI / 2);
export const world = { frame: 0, explode: null, active: () => true, playerPos: () => camera.position };
export function updateWorld(dt, t) {
  uTime.value = t; updateFx(dt); sfx.update(dt);
  for (let i = 0; i < fireLights.length; i++) fireLights[i].intensity = 18 + Math.sin(t * 17 + i * 3) * 5 + Math.sin(t * 31 + i) * 4;
  for (const e of emitters) { if (e.p.distanceToSquared(camera.position) > 220 * 220) continue; e.acc += dt * e.rate; while (e.acc >= 1) { e.acc--; if (e.type === 'smoke') { const c = rand(0.12, 0.3); smoke.spawn(e.p.x + rand(-0.6, 0.6), e.p.y, e.p.z + rand(-0.6, 0.6), rand(-0.5, 0.5) + 0.8, rand(1.2, 2.4), rand(-0.5, 0.5) + 0.4, rand(5, 9), 1.5, 9, c, c * 0.95, c * 0.9, 0.55, 0.25, -0.15); } else sparks.spawn(e.p.x + rand(-0.7, 0.7), e.p.y, e.p.z + rand(-0.7, 0.7), rand(-0.4, 0.4), rand(1.5, 3.5), rand(-0.4, 0.4), rand(0.3, 0.8), rand(0.6, 1.4), 0.2, 1, rand(0.35, 0.6), 0.08, 0.9, 1, 0); } }
  { const p = ash.geometry.attributes.position.array, c = camera.position; for (let i = 0; i < p.length; i += 3) { p[i] += (0.6 + Math.sin(t + i) * 0.3) * dt; p[i + 1] -= 0.35 * dt; p[i + 2] += 0.25 * dt; if (p[i] - c.x > 25) p[i] -= 50; if (p[i] - c.x < -25) p[i] += 50; if (p[i + 2] - c.z > 25) p[i + 2] -= 50; if (p[i + 2] - c.z < -25) p[i + 2] += 50; if (p[i + 1] < c.y - 3) p[i + 1] += 14; } ash.geometry.attributes.position.needsUpdate = true; }
  for (let i = 0; i < jets.length; i++) { const j = jets[i], f = j.userData.f, ang = t * f.spd + f.phase; j.position.set(Math.cos(ang) * f.r, f.h + Math.sin(t * 0.4 + i) * 5, Math.sin(ang) * f.r); _a.set(Math.cos(ang + 0.02) * f.r, f.h + Math.sin(t * 0.4 + 0.05 + i) * 5, Math.sin(ang + 0.02) * f.r); j.lookAt(_a); _b.set(1, 0, 0).applyQuaternion(j.quaternion); _c.copy(j.position).negate().normalize(); j.rotateZ(_b.dot(_c) > 0 ? -0.55 : 0.55); if ((world.frame + i) % 2 === 0) { j.userData.exhaust.getWorldPosition(_a); smoke.spawn(_a.x, _a.y, _a.z, rand(-0.5, 0.5), rand(-0.3, 0.3), rand(-0.5, 0.5), 4, 1.2, 6, 0.85, 0.85, 0.85, 0.35, 0.2, 0); } }
  jetSoundT -= dt; if (jetSoundT <= 0) { jetSoundT = rand(6, 12); const j = jets[randi(0, 2)]; sfx.jet(j.position.distanceTo(camera.position), panFor(j.position)); }
  bomberT -= dt;
  if (!bomber && bomberT <= 0) { bomber = bomberFactory(); const a = rand(0, 6.3); bomber.position.set(Math.cos(a) * 420, 150, Math.sin(a) * 420); const tgt = V3(rand(-120, 120), 150, rand(-120, 120)); bomber.userData.v = tgt.sub(bomber.position).normalize().multiplyScalar(42); bomber.lookAt(bomber.position.clone().add(bomber.userData.v)); bomber.userData.drops = 5; bomber.userData.dropT = 0; scene.add(bomber); }
  if (bomber) { bomber.position.addScaledVector(bomber.userData.v, dt); const b = bomber.userData; if (Math.abs(bomber.position.x) < 170 && Math.abs(bomber.position.z) < 170 && b.drops > 0) { b.dropT -= dt; if (b.dropT <= 0) { b.dropT = 0.7; b.drops--; const m = new THREE.Mesh(bombGeo, mats.steel); m.position.copy(bomber.position).y -= 1.5; m.userData.v = b.v.clone().multiplyScalar(0.7); m.quaternion.copy(bomber.quaternion); scene.add(m); bombs.push(m); if (b.drops === 4) sfx.whistle(4); } } if (bomber.position.length() > 480) { scene.remove(bomber); bomber = null; bomberT = rand(25, 45); } }
  for (const b of bombs.slice()) { b.userData.v.y -= 20 * dt; b.position.addScaledVector(b.userData.v, dt); b.lookAt(b.position.clone().add(b.userData.v)); if (b.position.y <= getH(b.position.x, b.position.z)) { b.position.y = getH(b.position.x, b.position.z); world.explode && world.explode(b.position, true); scene.remove(b); bombs.splice(bombs.indexOf(b), 1); } }
  artT -= dt; if (artT <= 0) { artT = rand(7, 16); const pp = world.playerPos(), a = rand(0, 6.3), r = rand(40, 140), p = V3(clamp(pp.x + Math.cos(a) * r, -MAP, MAP), 0, clamp(pp.z + Math.sin(a) * r, -MAP, MAP)); p.y = getH(p.x, p.z); sfx.whistle(1.4); setTimeout(() => { if (world.active()) world.explode && world.explode(p, false); }, 1400); }
  for (const tk of tanks) { const u = tk.userData; if (u.wrecked || u.driven) continue; u.fireT -= dt;
    if (u.proc) u.turret.rotation.y = lerpAngle(u.turret.rotation.y, u.yawT, 1 - Math.exp(-0.8 * dt));
    if (u.fireT <= 0) { u.fireT = rand(9, 18); if (u.proc) u.yawT = rand(-3.1, 3.1); const m = u.muzzle.getWorldPosition(_a).clone(); const dir = _b.set(0, 0, 1).applyQuaternion((u.proc ? u.bar : u.muzzle).getWorldQuaternion(_quat)).normalize(); dir.y -= 0.02;
      burst(m, 40, 14, [1, 0.7, 0.3], 1.2, 0.3, 0); puffSmoke(m, 12, 2, 7, 0.4, [2, 4], 1.5, 1, 0.5); const l = expLights[0]; l.position.copy(m); l.intensity = 800; const dist = m.distanceTo(camera.position); sfx.tankShot(dist, panFor(m)); fx.shake = Math.max(fx.shake, 0.6 / (1 + dist / 25));
      let td = rayTerrain(m, dir, 260); if (td === Infinity) td = 220; const hit = m.clone().addScaledVector(dir, td); hit.y = Math.max(hit.y, getH(hit.x, hit.z)); setTimeout(() => { if (world.active()) world.explode && world.explode(hit, false); }, td / 180 * 1000); if (u.proc) u.bar.position.z = 0.6; }
    if (u.proc) u.bar.position.z = lerp(u.bar.position.z, 1.2, 1 - Math.exp(-3 * dt)); }
  if (world.frame % 30 === 0) fitViewport();
  if (forestCull && world.frame % 3 === 0) forestCull();
  sun.position.copy(camera.position).addScaledVector(sunDir, 150); sun.target.position.copy(camera.position); sky.position.copy(camera.position);
}
export function fitViewport(w = innerWidth, h = innerHeight) { if (w < 2 || h < 2) return; const pr = renderer.getPixelRatio(); if (Math.abs(renderer.domElement.width - w * pr) < 2 && Math.abs(renderer.domElement.height - h * pr) < 2) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }
addEventListener('resize', () => fitViewport());
unseedWorld();   // module-level world generation done
