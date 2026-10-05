/* game.js — gameplay: player, soldiers/bots, weapons (animated rigs), game modes, HUD/lobby, multiplayer client. */
import { THREE, MAP, rand, randi, clamp, lerp, smooth, $, V3, _a, _b, _c, lerpAngle, settings, career, saveSettings, saveCareer, sfx, renderer, scene, camera, getH, addObs, obsBox, freeSpot, resolveCollision, losClear, rayTerrain, rayTrees, sparks, puffSmoke, burst, tracer, explodeFx, fx, panFor, loadModel, setupTextures, partsFromScene, forestPatch, buildStructures, buildForest, forestClear, solids, mapImg, tanks, world, updateWorld, flashTex, softTex, expLights, buildJet, STEP, obstacles, seedWorld, unseedWorld } from './core.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// =====================================================================
// CONFIG
// =====================================================================
const DIFF = {
  easy:   { count: 5, hp: 70,  dmg: 7,  acc: 0.30, react: 1.4,  pause: 1.5,  speed: 3.2, range: 38, detect: 40, hear: 25, waveAdd: 1, burst: [2, 3], strafe: 0.5, hold: 0.6, flank: false, alertAll: false, radar: 'always', xp: 1 },
  medium: { count: 7, hp: 100, dmg: 11, acc: 0.50, react: 0.8,  pause: 0.9,  speed: 4.3, range: 50, detect: 55, hear: 40, waveAdd: 2, burst: [3, 4], strafe: 1.0, hold: 0.35, flank: false, alertAll: false, radar: 'fire', xp: 1.5 },
  hard:   { count: 9, hp: 140, dmg: 16, acc: 0.72, react: 0.35, pause: 0.55, speed: 5.4, range: 65, detect: 75, hear: 60, waveAdd: 3, burst: [3, 6], strafe: 1.4, hold: 0.15, flank: true,  alertAll: true,  radar: 'fire', xp: 2.2 },
};
const WEAPONS = {
  ak:     { key: 'ak', name: 'AK-74', slot: 'primary', kind: 'ak', mode: 'AUTO', dmg: 30, head: 2.0, rpm: 650, mag: 30, reserve: 150, spread: 0.022, adsSpread: 0.006, recoil: 0.03, kick: 0.05, auto: true, reload: 2.9, range: 300, fov: 62, pickup: 30, model: 'fps_ak_animated.glb',
            rig: { scale: 0.0085, hip: [2.5, 16, -46], ads: [0, 18.9, -24], muzzle: [0, 14.3, 76], basePart: 'base_ak74', sights: { attach: 'base_ak74', rear: [0, 14.69, 22], front: [0, 14.64, 64], relief: 0.2 }, clips: { idle: [6.7, 7.3], fire: [0.0, 0.33], reload: [3.5, 6.4], draw: [7.43, 8.1] } },
            desc: '5.45 · full auto · 30 rnd', stats: [55, 80, 55, 60] },
  sniper: { key: 'sniper', name: 'AWM', slot: 'primary', kind: 'sniper', mode: 'BOLT', dmg: 110, head: 3, rpm: 45, mag: 5, reserve: 25, spread: 0.03, adsSpread: 0.0004, recoil: 0.12, kick: 0.1, auto: false, reload: 3.55, range: 600, fov: 24, scope: true, pickup: 5, model: 'sniper_animated.glb',
            rig: { scale: 0.0085, hip: [3, 15.5, -52], ads: [0, 17.2, -26], muzzle: [0, 10.3, 102.5], basePart: 'base_sniper', scope: { render: 'scoperender', reticle: 'reticle', fov: 4 }, sights: { attach: 'base_sniper', rear: [0, 17.2, -0.25], front: [0, 17.2, 7.45], relief: 0.06 }, clips: { idle: [4.8, 5.5], fire: [0.43, 1.0], reload: [1.2, 4.75], draw: [5.6, 6.5] } },
            desc: '.338 · bolt action · 5 rnd', stats: [100, 15, 100, 30] },
  ar:     { key: 'ar', name: 'AR-15', slot: 'primary', kind: 'ar', mode: 'AUTO', dmg: 26, head: 2.0, rpm: 720, mag: 30, reserve: 180, spread: 0.02, adsSpread: 0.005, recoil: 0.022, kick: 0.045, auto: true, reload: 2.1, range: 300, fov: 62, pickup: 30, model: 'ar-15.glb', donor: 'ak', swap: { muzzleMax: true, len: 0.8, reddot: true, relief: 0.17, hipOff: [0.01, -0.03, -0.03], cut: -0.08, sightPt: [0.153, 0.065, 0.014], lens: { y: 0.065, z: 0.014, r: 0.0112 }, tint: [[/UpperReciever/i, 0x4a4b4d], [/None\.002/i, 0x353533], [/None\.003/i, 0x3d3d3a], [/checker/i, 0x2a2a2a]] },
            desc: '5.56 · full auto · 30 rnd', stats: [45, 85, 65, 60] },
  pistol: { key: 'pistol', name: 'DESERT EAGLE', slot: 'secondary', kind: 'pistol', mode: 'SEMI', dmg: 52, head: 2.5, rpm: 280, mag: 7, reserve: 42, spread: 0.014, adsSpread: 0.004, recoil: 0.07, kick: 0.09, auto: false, reload: 3.8, range: 220, fov: 66, pickup: 14, model: 'animated_pistol.glb',
            rig: { scale: 0.0085, hip: [2.5, 13.5, -44], ads: [0, 9.9, -32], muzzle: [0, 7.3, 23.8], basePart: 'base_talon', sights: { attach: 'base_talon', rear: [0, 9.31, -2], front: [0, 9.17, 23], relief: 0.3 }, clips: { idle: [7.3, 7.8], fire: [0.0, 0.5], reload: [0.55, 4.35], draw: [8.3, 9.0] } },
            desc: '.50 AE · semi auto · 7 rnd', stats: [75, 35, 70, 90] },
  glock:  { key: 'glock', name: 'GLOCK 17', slot: 'secondary', kind: 'pistol', mode: 'SEMI', dmg: 34, head: 2.5, rpm: 420, mag: 17, reserve: 85, spread: 0.012, adsSpread: 0.003, recoil: 0.045, kick: 0.07, auto: false, reload: 1.5, range: 200, fov: 66, pickup: 17, model: 'glock_gun_3d_model_free_download.glb', donor: 'pistol', swap: { muzzleMax: false, len: 0.23, relief: 0.3, tint: [] },
            desc: '9mm · semi auto · 17 rnd', stats: [45, 55, 75, 95] },
};
const MODES = {
  survival: { name: 'SURVIVAL', sub: 'ENDLESS WAVES', desc: 'Hold the forest alone against waves of hostiles. No respawns.', teams: false },
  tdm:      { name: 'TEAM DEATHMATCH', sub: 'FIRST TO 40', desc: '6v6. Your squad against theirs. First team to 40 kills wins.', teams: true, target: 40, bots: 6 },
  ctf:      { name: 'CAPTURE THE FLAG', sub: 'FIRST TO 3', desc: 'Steal the enemy flag from their base and bring it home. First to 3 captures.', teams: true, target: 3, bots: 5 },
  dom:      { name: 'DOMINATION', sub: 'FIRST TO 200', desc: 'Capture and hold A, B and C. Held points score every 2 seconds.', teams: true, target: 200, bots: 6 },
};
const TEAM = [{ name: 'SPECTRE', color: '#4fc3ff', hex: 0x4fc3ff, css: 'rgba(79,195,255,' }, { name: 'VANGUARD', color: '#ff5a3a', hex: 0xff5a3a, css: 'rgba(255,90,58,' }];
const RANKS = ['RECRUIT', 'PRIVATE', 'CORPORAL', 'SERGEANT', 'LIEUTENANT', 'CAPTAIN', 'MAJOR', 'COLONEL', 'GENERAL', 'LEGEND'];
const BASES = [V3(-85, 0, -85), V3(85, 0, 85)], DOM_POINTS = [{ n: 'A', p: V3(-70, 0, 55) }, { n: 'B', p: V3(5, 0, -15) }, { n: 'C', p: V3(70, 0, -60) }];
for (const b of BASES) { forestClear.push({ x: b.x, z: b.z, r: 24 }); const L = Math.hypot(b.x, b.z); for (let d = -6; d <= 170; d += 8) forestClear.push({ x: b.x - b.x / L * d, z: b.z - b.z / L * d, r: d < 50 ? 30 : 18 }); }   // runways toward the centre (wide apron for the jets + B-2) for (const d of DOM_POINTS) forestClear.push({ x: d.p.x, z: d.p.z, r: 12 });
const levelOf = xp => Math.floor(xp / 1000) + 1;

// =====================================================================
// GAME STATE
// =====================================================================
let state = 'menu', now = 0, D = DIFF[settings.diff] || DIFF.medium, mode = 'survival', M = MODES.survival;
let wave = 1, waveT = 0, teamScore = [0, 0], matchT = 0, matchOver = false, winner = -1;
const player = { pos: V3(0, 0, 4), vel: V3(), hp: 100, maxHp: 100, team: 0, onGround: true, lastHit: -99, dead: false, deadT: 0, kills: 0, hs: 0, deaths: 0, score: 0, xpEarned: 0, caps: 0, sprinting: false, crouch: false, eyeH: 1.7, walkT: 0, stepPhase: 0, yaw: Math.PI, pitch: 0, name: settings.name, flag: null, isPlayer: true,
  get eye() { return camera.position; },
  damage(a, from, attacker) { if (this.dead || state !== 'play' || matchOver) return; if (driver.tank && !(attacker && attacker.isRemote)) a *= 0.25; this.hp -= a; this.lastHit = now; this.lastAttacker = attacker || null; sfx.hurt(); $('vignette').style.opacity = clamp(0.4 + a / 30, 0, 1); fx.shake = Math.max(fx.shake, 0.3); if (from) dmgDir(from); if (this.hp <= 0) { this.hp = 0; die(attacker); } } };
const entities = []; // bots + remote players (anything shootable with a team)
const entityGroup = new THREE.Group(); scene.add(entityGroup);
const keys = {}; let mouseDown = false, ads = false, mdx = 0, dmgDirT = 0, scoreboard = false;
function dmgDir(from) { const dx = from.x - player.pos.x, dz = from.z - player.pos.z, rel = Math.atan2(dx, -dz) + player.yaw; $('dmgdir').style.transform = `rotate(${rel}rad)`; $('dmgdir').style.opacity = 1; dmgDirT = 1; }
function enemiesOf(team) { const out = []; if (player.team !== team && !player.dead && state === 'play') out.push(player); for (const e of entities) if (e.team !== team && !e.dead) out.push(e); return out; }

// =====================================================================
// ASSETS
// =====================================================================
const assets = { tank: null, soldier: null, forest: null, guns: {} };
const geoCache = {}; const bgeo = (w, h, d) => geoCache[w + ',' + h + ',' + d] || (geoCache[w + ',' + h + ',' + d] = new THREE.BoxGeometry(w, h, d));
function box(w, h, d, mat, x = 0, y = 0, z = 0, shadow = true) { const m = new THREE.Mesh(bgeo(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; return m; }
const vmMats = { metal: new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.45, metalness: 0.75 }), dark: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6, metalness: 0.4 }), grip: new THREE.MeshStandardMaterial({ color: 0x2e2620, roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: 0xc69c7b, roughness: 0.8 }), sleeve: new THREE.MeshStandardMaterial({ color: 0x4b5537, roughness: 0.95 }), gun: new THREE.MeshStandardMaterial({ color: 0x4a4b4d, roughness: 0.42, metalness: 0.35, side: THREE.DoubleSide }) };

// --- soldier model split into limbs so an unrigged mesh can be posed and walk
let soldierParts = null;
function buildSoldierParts(gltf) {
  const root = gltf.scene; root.updateMatrixWorld(true); const S = 0.18;
  const PIV = { torso: [0, 0, 0], head: [0, 8.1, 0], legL: [-0.75, 4.0, 0], legR: [0.75, 4.0, 0], armL: [-1.55, 5.2, 0], armR: [1.55, 5.2, 0] }, out = {};
  root.traverse(o => {
    if (!o.isMesh) return; const g = o.geometry.clone().applyMatrix4(o.matrixWorld), pos = g.attributes.position.array, nor = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null, idx = g.index ? g.index.array : null, tri = idx ? idx.length / 3 : pos.length / 9, matName = o.material.name || '';
    const buckets = {};
    for (let t = 0; t < tri; t++) { const v = k => idx ? idx[t * 3 + k] : t * 3 + k, cx = (pos[v(0) * 3] + pos[v(1) * 3] + pos[v(2) * 3]) / 3, cy = (pos[v(0) * 3 + 1] + pos[v(1) * 3 + 1] + pos[v(2) * 3 + 1]) / 3;
      let r = 'torso'; if (/Head|^material$/.test(matName)) r = 'head'; else if (cy < 4.0 && Math.abs(cx) < 1.6) r = cx < 0 ? 'legL' : 'legR'; else if (Math.abs(cx) > 1.55 && cy > 3.8) r = cx < 0 ? 'armL' : 'armR';
      (buckets[r] = buckets[r] || []).push(t); }
    for (const r in buckets) { const tris = buckets[r], P = new Float32Array(tris.length * 9), N = new Float32Array(tris.length * 9), U = new Float32Array(tris.length * 6), pv = PIV[r]; let o2 = 0;
      for (const t of tris) for (let k = 0; k < 3; k++, o2++) { const v = idx ? idx[t * 3 + k] : t * 3 + k; P[o2 * 3] = (pos[v * 3] - pv[0]) * S; P[o2 * 3 + 1] = (pos[v * 3 + 1] - pv[1]) * S; P[o2 * 3 + 2] = (pos[v * 3 + 2] - pv[2]) * S; N[o2 * 3] = nor[v * 3]; N[o2 * 3 + 1] = nor[v * 3 + 1]; N[o2 * 3 + 2] = nor[v * 3 + 2]; if (uv) { U[o2 * 2] = uv[v * 2]; U[o2 * 2 + 1] = uv[v * 2 + 1]; } }
      const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.BufferAttribute(P, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(N, 3)); ng.setAttribute('uv', new THREE.BufferAttribute(U, 2)); (out[r] = out[r] || []).push({ geo: ng, mat: o.material }); }
  });
  const piv = {}; for (const k in PIV) piv[k] = V3(PIV[k][0] * S, PIV[k][1] * S, PIV[k][2] * S);
  return { parts: out, piv, teamMats: [new Map(), new Map()] };
}
function teamMat(base, team) { const cache = soldierParts.teamMats[team]; let m = cache.get(base); if (!m) { m = base.clone(); m.color = base.color.clone().multiply(team === 0 ? new THREE.Color(0.72, 0.86, 1.25) : new THREE.Color(1.25, 0.78, 0.7)); cache.set(base, m); } return m; }
let botGun = null; // AK mesh pulled out of the animated rig for bots to carry
class Soldier {
  constructor(owner, team) {
    const g = this.g = new THREE.Group(); g.rotation.order = 'YXZ'; this.owner = owner; this.team = team;
    const tag = (m, part) => { m.userData.entity = owner; m.userData.part = part; return m; };
    const hb = new THREE.MeshBasicMaterial({ visible: false });
    g.add(tag(box(0.3, 0.3, 0.3, hb, 0, 1.62, 0, false), 'head'), tag(box(0.55, 0.72, 0.36, hb, 0, 1.13, 0, false), 'body'), tag(box(0.5, 0.85, 0.34, hb, 0, 0.43, 0, false), 'legs'));
    if (soldierParts) {
      const P = soldierParts.parts, pv = soldierParts.piv, mk = (list, parent, pos) => { const grp = new THREE.Group(); grp.position.copy(pos); for (const { geo, mat } of list || []) { const m = new THREE.Mesh(geo, teamMat(mat, team)); m.castShadow = true; m.receiveShadow = true; m.raycast = () => {}; m.frustumCulled = false; grp.add(m); } parent.add(grp); return grp; };
      this.torso = mk(P.torso, g, pv.torso); this.head = mk(P.head, g, pv.head); this.legL = mk(P.legL, g, pv.legL); this.legR = mk(P.legR, g, pv.legR); this.armL = mk(P.armL, g, pv.armL); this.armR = mk(P.armR, g, pv.armR);
      this.armL.rotation.set(-0.75, 0, 1.25); this.armR.rotation.set(-0.75, 0, -1.25); this.armL.visible = this.armR.visible = false;   // T-pose arms look severed when posed; hide them
      if (botGun) { const gun = botGun.clone(); gun.position.set(0.1, 0.98, 0.26); gun.rotation.set(-0.05, 0, 0); gun.traverse(o => { o.raycast = () => {}; if (o.isMesh) o.castShadow = true; }); g.add(gun); this.gun = gun; this.muzzle = gun.getObjectByName('muzzle'); }
    } else {
      const bm = { cloth: new THREE.MeshStandardMaterial({ color: team === 0 ? 0x3d4a5c : 0x4b5537, roughness: 0.95 }), dark: new THREE.MeshStandardMaterial({ color: 0x2c2d27, roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: 0xc69c7b, roughness: 0.8 }), gun: new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.6, metalness: 0.5 }) };
      g.add(box(0.5, 0.62, 0.3, bm.cloth, 0, 1.22, 0), box(0.54, 0.42, 0.36, bm.dark, 0, 1.25, 0), box(0.26, 0.28, 0.26, bm.skin, 0, 1.76, 0));
      for (const s of [-1, 1]) { const leg = new THREE.Group(); leg.position.set(s * 0.14, 0.92, 0); leg.add(box(0.2, 0.9, 0.22, bm.cloth, 0, -0.45, 0)); g.add(leg); if (s < 0) this.legL = leg; else this.legR = leg; }
      const arms = new THREE.Group(); arms.position.set(0, 1.42, 0); g.add(arms); arms.add(box(0.16, 0.16, 0.5, bm.cloth, 0.22, -0.05, 0.22), box(0.16, 0.16, 0.45, bm.cloth, -0.12, -0.08, 0.3)); this.armL = this.armR = arms;
      const rifle = new THREE.Group(); rifle.position.set(0.1, 1.4, 0.35); g.add(rifle); rifle.add(box(0.07, 0.1, 0.5, bm.gun, 0, 0, 0.15), box(0.035, 0.035, 0.45, bm.gun, 0, 0.02, 0.6)); this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, 0.02, 0.85); rifle.add(this.muzzle);
      this.torso = g; this.head = null;
    }
    if (!this.muzzle) { this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0.1, 1.1, 0.9); g.add(this.muzzle); }
    // name tag
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; this.tagCtx = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); this.tag.scale.set(1.6, 0.4, 1); this.tag.position.y = 2.15; this.tag.visible = false; this.tag.raycast = () => {}; g.add(this.tag);
    this.walk = 0; this.moving = false; entityGroup.add(g);
  }
  setTag(text, color) { const x = this.tagCtx; x.clearRect(0, 0, 256, 64); x.font = 'bold 28px Bahnschrift, Arial Narrow, sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(40, 10, 176, 40); x.fillStyle = color; x.fillText(text, 128, 40); this.tag.material.map.needsUpdate = true; this.tag.visible = true; }
  animate(dt, moving, speed, aimPitch, crouch) {
    if (moving) this.walk += dt * speed * 1.9; const sw = moving ? Math.sin(this.walk) * 0.65 : 0;
    this.legL.rotation.x = sw; this.legR.rotation.x = -sw;
    if (soldierParts) { this.armL.rotation.x = -0.75 - aimPitch * 0.6 + (moving ? Math.sin(this.walk) * 0.08 : 0); this.armR.rotation.x = -0.75 - aimPitch * 0.6 - (moving ? Math.sin(this.walk) * 0.08 : 0); if (this.gun) this.gun.rotation.x = -0.05 - aimPitch; this.torso.position.y = (moving ? Math.abs(Math.cos(this.walk)) * 0.03 : 0); this.g.scale.y = lerp(this.g.scale.y, crouch ? 0.72 : 1, 1 - Math.exp(-8 * dt)); }
    else this.armL.rotation.x = -aimPitch;
  }
  setDead(t, fall) { const k = smooth(Math.min(1, t / 0.5)); this.g.rotation.x = -Math.PI / 2 * k * fall; this.tag.visible = false; }
  remove() { entityGroup.remove(this.g); }
}

// =====================================================================
// WEAPON VIEWMODELS
// =====================================================================
const weaponRoot = new THREE.Group(); camera.add(weaponRoot);
const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); flash.scale.set(0.3, 0.3, 1); flash.visible = false; scene.add(flash);
const muzzleLight = new THREE.PointLight(0xffa040, 0, 14, 2); scene.add(muzzleLight);
class RigVM {
  constructor(w, gltf, swap) {
    this.w = w; const r = w.rig, s = r.scale; this.root = new THREE.Group(); this.inner = gltf.scene; this.inner.position.set(0, 0, 0); this.inner.rotation.set(0, Math.PI, 0); this.inner.scale.setScalar(s); this.root.add(this.inner);
    this.inner.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; if (o.isSkinnedMesh) o.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); } });
    this.mixer = new THREE.AnimationMixer(this.inner); const clip = gltf.animations[0]; this.actions = {}; this.len = {};
    for (const n in r.clips) { const [a, b] = r.clips[n], sub = THREE.AnimationUtils.subclip(clip, n, Math.round(a * 30), Math.round(b * 30), 30); const act = this.mixer.clipAction(sub); act.clampWhenFinished = true; act.setLoop(n === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, n === 'idle' ? Infinity : 1); this.actions[n] = act; this.len[n] = sub.duration; }
    this.mixer.addEventListener('finished', e => { if (e.action !== this.actions.idle) this.play('idle', 0.12); });
    let base = null; this.inner.traverse(o => { if (!base && o.isMesh && o.name.startsWith(r.basePart)) base = o; });
    this.inner.traverse(o => { if (o.isMesh && /^scoperender/i.test(o.name) && !r.scope) o.visible = false; if (o.isMesh && o.material) { const n = o.material.name || ''; if (/^lens$/i.test(n)) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.12; o.material.depthWrite = false; } if (/reticle/i.test(n)) { o.material = o.material.clone(); o.material.transparent = true; o.material.alphaTest = 0.1; o.material.depthWrite = false; } } });
    this.muzzle = new THREE.Object3D(); this.muzzle.position.set(...r.muzzle); (base || this.inner).add(this.muzzle);
    const off = C => V3(C[0] * s, -C[1] * s, C[2] * s); this.hip = off(r.hip); this.ads = off(r.ads);
    if (r.scope) this.setupScope(r.scope, base);
    if (r.sights) { let att = null; this.inner.traverse(o => { if (!att && o.isMesh && o.name.startsWith(r.sights.attach)) att = o; }); if (att) { this.sightRear = new THREE.Object3D(); this.sightRear.position.set(...r.sights.rear); this.sightFront = new THREE.Object3D(); this.sightFront.position.set(...r.sights.front); att.add(this.sightRear, this.sightFront); this.relief = r.sights.relief; } }
    if (swap && base) this.swapGun(base, swap, r, s);
    this.cur = null; this.play('idle', 0); this.calibrate();
  }
  // scope: the model has a 'scoperender' disc inside the tube; a second camera renders the zoomed view into it every frame
  setupScope(cfg, base) {
    let rnd = null, ret = null, lens = null; this.inner.traverse(o => { if (!o.isMesh) return; if (!rnd && o.name.startsWith(cfg.render)) rnd = o; if (!ret && o.name.startsWith(cfg.reticle)) ret = o; if (!lens && /^lens/i.test(o.name)) lens = o; });
    if (!rnd || !base) return;
    this.mixer.update(0); this.root.updateMatrixWorld(true);
    const planarUV = mesh => { const geo = mesh.geometry.clone(), pos = geo.attributes.position, v = new THREE.Vector3(), P = []; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); base.worldToLocal(v); P.push(v.x, v.y); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const uv = new Float32Array(pos.count * 2); for (let i = 0; i < pos.count; i++) { uv[i * 2] = (x1 - P[i * 2]) / (x1 - x0); uv[i * 2 + 1] = (P[i * 2 + 1] - y0) / (y1 - y0); }   // base-local -X is screen-right, +Y up
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); mesh.geometry = geo; };
    const rt = new THREE.WebGLRenderTarget(1024, 1024, { samples: 2 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    planarUV(rnd); rnd.material = new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }); rnd.visible = true;
    if (ret) { planarUV(ret); ret.material = new THREE.MeshBasicMaterial({ map: reticleTexture(), transparent: true, depthWrite: false, toneMapped: false }); ret.renderOrder = 2; ret.visible = true; }
    if (lens) lens.visible = false;
    this.scope = { rt, cam: new THREE.PerspectiveCamera(cfg.fov, 1, 0.1, 1500) };
  }
  // replace the rig's own gun with another model, keeping the animated hands: align barrel height + grip/mag position
  swapGun(base, swap, r, s) {
    this.inner.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) o.visible = false; });
    const holder = new THREE.Group(); holder.position.copy(base.position); holder.quaternion.copy(base.quaternion); holder.scale.copy(base.scale); base.parent.add(holder);
    const bp = base.geometry.attributes.position.array; let lowZ = 0, lowY = Infinity; for (let i = 0; i < bp.length; i += 3) if (bp[i + 1] < lowY) { lowY = bp[i + 1]; lowZ = bp[i + 2]; }   // donor receiver's lowest point = where the new gun's lowest point goes
    const parts = partsFromScene(swap.gltf.scene), g = new THREE.Group(), box3 = new THREE.Box3();
    for (const p of parts) { p.geo.computeBoundingBox(); box3.union(p.geo.boundingBox); const t = swap.tint.find(t => t[0].test(p.matName)); const mat = t ? new THREE.MeshStandardMaterial({ color: t[1], roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }) : p.mat;
      // see-through red dot lens; stock behind the grip clipped (it sits where the shoulder is and blocks the hip view)
      const L = swap.lens && /checker/i.test(p.matName) ? swap.lens : null, cut = swap.cut;
      if (L || cut !== undefined) mat.onBeforeCompile = sh => { sh.vertexShader = 'varying vec3 vMP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMP = position;'); sh.fragmentShader = 'varying vec3 vMP;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n' + (L ? ` if (length(vMP.yz - vec2(${L.y}, ${L.z})) < ${L.r}) discard;\n` : '') + (cut !== undefined ? ` if (vMP.x < ${cut.toFixed(3)}) discard;\n` : '')); };
      const m = new THREE.Mesh(p.geo, mat); m.castShadow = false; m.frustumCulled = false; g.add(m); }
    const size = box3.getSize(new THREE.Vector3()), c = box3.getCenter(new THREE.Vector3()), endX = swap.muzzleMax ? box3.max.x : box3.min.x, sc = (swap.len / s) / size.x;
    let my = 0, mz = 0, mc = 0, gLowY = Infinity, gLow = null; for (const p of parts) { const a = p.geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { if (Math.abs(a[i] - endX) < size.x * 0.03) { my += a[i + 1]; mz += a[i + 2]; mc++; } if (a[i + 1] < gLowY) { gLowY = a[i + 1]; gLow = V3(a[i], a[i + 1], a[i + 2]); } } }
    const barrel = V3(endX, mc ? my / mc : c.y, mc ? mz / mc : c.z), rot = new THREE.Euler(0, swap.muzzleMax ? -Math.PI / 2 : Math.PI / 2, 0), tv = v => v.clone().applyEuler(rot).multiplyScalar(sc);
    g.rotation.copy(rot); g.scale.setScalar(sc);
    const tb = tv(barrel), tl = tv(gLow), tc = tv(c); g.position.set(-tc.x, r.muzzle[1] - tb.y, lowZ - tl.z); holder.add(g);
    this.muzzle.parent.remove(this.muzzle); this.muzzle.position.copy(tb).add(g.position); holder.add(this.muzzle);
    let rear, front; const fw = swap.muzzleMax ? 1 : -1;
    if (swap.sightPt) { rear = V3(...swap.sightPt); front = rear.clone().add(V3(0.05 * fw, 0, 0)); }   // optic axis
    else {   // iron sights: highest point on the centreline at the rear and at the front end of the slide
      const rearEnd = swap.muzzleMax ? box3.min.x : box3.max.x, wz = size.z * 0.12; let ry = -Infinity, fy = -Infinity;
      for (const pp of parts) { const a = pp.geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { if (Math.abs(a[i + 2] - c.z) > wz) continue; const f = (a[i] - rearEnd) / (endX - rearEnd); if (f < 0.2 && a[i + 1] > ry) { ry = a[i + 1]; rear = V3(a[i], a[i + 1], c.z); } if (f > 0.85 && a[i + 1] > fy) { fy = a[i + 1]; front = V3(a[i], a[i + 1], c.z); } } }
      if (!rear || !front) { rear = V3(rearEnd, box3.max.y, c.z); front = V3(endX, box3.max.y, c.z); }
    }
    if (this.sightRear) { this.sightRear.parent.remove(this.sightRear); this.sightFront.parent.remove(this.sightFront); }
    this.sightRear = new THREE.Object3D(); this.sightRear.position.copy(tv(rear).add(g.position)); this.sightFront = new THREE.Object3D(); this.sightFront.position.copy(tv(front).add(g.position)); holder.add(this.sightRear, this.sightFront);
    this.relief = swap.relief || 0.2; this.reddot = !!swap.reddot; this.swap = swap;
  }
  calibrate() { if (this.swap && this.swap.hipOff) this.hip = this.hip.clone().add(V3(...this.swap.hipOff)); }
  play(name, fade = 0.08, speed = 1) { const act = this.actions[name]; if (!act) return; for (const k in this.actions) if (this.actions[k] !== act && this.actions[k].isRunning()) this.actions[k].fadeOut(fade); act.reset(); act.timeScale = speed; act.fadeIn(fade).play(); this.cur = name; }
  update(dt) { this.mixer.update(dt); }
}
let reticleTex = null;
function reticleTexture() {
  if (reticleTex) return reticleTex; const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), m = 256;
  x.strokeStyle = '#000'; x.lineCap = 'butt'; x.lineWidth = 9; x.beginPath(); x.moveTo(0, m); x.lineTo(m - 110, m); x.moveTo(512, m); x.lineTo(m + 110, m); x.moveTo(m, 512); x.lineTo(m, m + 110); x.stroke();   // heavy outer posts
  x.lineWidth = 2; x.beginPath(); x.moveTo(m - 110, m); x.lineTo(m + 110, m); x.moveTo(m, m + 110); x.lineTo(m, m - 256); x.stroke();   // fine crosshair
  for (let i = 1; i <= 4; i++) { x.beginPath(); x.moveTo(m - 5, m + i * 22); x.lineTo(m + 5, m + i * 22); x.moveTo(m - i * 22, m - 5); x.lineTo(m - i * 22, m + 5); x.moveTo(m + i * 22, m - 5); x.lineTo(m + i * 22, m + 5); x.stroke(); }   // mil ticks
  x.fillStyle = '#e8261c'; x.beginPath(); x.arc(m, m, 3.5, 0, 7); x.fill();
  const g2 = x.createRadialGradient(m, m, 200, m, m, 256); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.85)'); x.fillStyle = g2; x.fillRect(0, 0, 512, 512);   // edge shadow
  reticleTex = new THREE.CanvasTexture(c); reticleTex.colorSpace = THREE.SRGBColorSpace; return reticleTex;
}
function renderScope() {
  if (state !== 'play' || player.dead || pilot.plane) return; const vm = vmFor(cur().key); if (!vm || !vm.scope || adsAmt < 0.25) return;
  const sc = vm.scope; camera.updateMatrixWorld(); sc.cam.position.setFromMatrixPosition(camera.matrixWorld); sc.cam.quaternion.setFromRotationMatrix(camera.matrixWorld); sc.cam.updateMatrixWorld();
  weaponRoot.visible = false; const fv = flash.visible; flash.visible = false; renderer.setRenderTarget(sc.rt); renderer.render(scene, sc.cam); renderer.setRenderTarget(null); weaponRoot.visible = true; flash.visible = fv;
}
const vms = {};
function vmFor(key) { return vms[key]; }

// =====================================================================
// PLAYER WEAPON STATE
// =====================================================================
let loadout = [settings.primary, settings.secondary], curSlot = 0, ammo = {};
let fireCd = 0, reloadT = 0, switchT = 0, recoilZ = 0, recoilX = 0, recoilPitch = 0, swayX = 0, flashT = 0, moveSpread = 0, triggerHeld = false, boltT = 0, adsAmt = 0;
const cur = () => WEAPONS[loadout[curSlot]];
function resetAmmo() { ammo = {}; for (const k of loadout) ammo[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve }; }
function setSlot(i) { if (curSlot === i || switchT > 0 || reloadT > 0) return; curSlot = i; switchT = 0.55; const vm = vmFor(cur().key); if (vm) vm.play('draw', 0.02, vm.len.draw / 0.55); sfx.click('bolt'); document.querySelectorAll('#wslots .slot').forEach((s, k) => s.classList.toggle('sel', k === i)); }
function startReload() { const w = cur(), a = ammo[w.key]; if (reloadT > 0 || switchT > 0 || a.mag >= w.mag || a.reserve <= 0) return; reloadT = w.reload; const vm = vmFor(w.key); if (vm) vm.play('reload', 0.08, (vm.len.reload || w.reload) / w.reload); sfx.reload(w.kind); }
const raycaster = new THREE.Raycaster(); raycaster.camera = camera;
function traceShot(origin, dir, maxD, ignore) {
  raycaster.set(origin, dir); raycaster.far = maxD; raycaster.near = 0.02;
  const hits = raycaster.intersectObjects([solids, entityGroup], true); let best = null;
  for (const h of hits) { const e = h.object.userData.entity; if (e && (e.dead || e === ignore)) continue; if (e && !h.object.userData.part) continue; best = h; break; }
  const terrD = rayTerrain(origin, dir, maxD), treeD = rayTrees(origin, dir, maxD), tD = Math.min(terrD, treeD);
  if (best && best.distance < tD) { const veh = best.object.userData.vehicle; if (veh && veh.remoteDriver && !veh.remoteDriver.dead && veh.remoteDriver !== ignore) return { point: best.point, dist: best.distance, entity: veh.remoteDriver, part: 'armor', metal: true }; return { point: best.point, dist: best.distance, entity: best.object.userData.entity, part: best.object.userData.part, metal: best.object.userData.metal }; }
  if (treeD < terrD) return { point: _c.copy(origin).addScaledVector(dir, treeD).clone(), dist: treeD, wood: true };
  if (tD < Infinity) return { point: _c.copy(origin).addScaledVector(dir, tD).clone(), dist: tD, terrain: true };
  return { point: _c.copy(origin).addScaledVector(dir, maxD).clone(), dist: maxD };
}
function impactFx(hit) {
  if (hit.terrain) { puffSmoke(hit.point, 4, 0.5, 1.6, 0.42, [0.6, 1.2], 0.6, 0.8, 0.5); burst(hit.point, 4, 4, [0.4, 0.3, 0.2], 0.15, 0.4); }
  else if (hit.metal) { burst(hit.point, 10, 7, [1, 0.8, 0.4], 0.12, 0.5); if (Math.random() < 0.4) sfx.ricochet(panFor(hit.point)); }
  else if (hit.wood) { burst(hit.point, 8, 5, [0.45, 0.32, 0.18], 0.14, 0.6); puffSmoke(hit.point, 2, 0.3, 1, 0.5, [0.4, 0.8], 0.4, 0.5, 0.4); }
  else burst(hit.point, 5, 4, [0.5, 0.4, 0.3], 0.12, 0.4);
}
function playerFire() {
  const w = cur(), a = ammo[w.key]; if (reloadT > 0 || switchT > 0 || boltT > 0) return;
  if (a.mag <= 0) { sfx.click('empty'); startReload(); fireCd = 0.3; return; }
  a.mag--; fireCd = 60 / w.rpm; player.sprinting = false; if (w.kind === 'sniper') boltT = 1.0;
  const sp = (ads ? w.adsSpread : w.spread) * (1 + moveSpread * 2.5) * (player.crouch ? 0.7 : 1);
  const dir = camera.getWorldDirection(_a.set(0, 0, -1)).clone(); dir.x += rand(-sp, sp); dir.y += rand(-sp, sp); dir.z += rand(-sp, sp); dir.normalize();
  const hit = traceShot(camera.position, dir, w.range, null), vm = vmFor(w.key);
  const mz = vm ? vm.muzzle.getWorldPosition(_b).clone() : camera.position.clone().addScaledVector(dir, 0.5);
  tracer(mz, hit.point);
  if (hit.entity) { const hs = hit.part === 'head'; hit.entity.damage(w.dmg * (hs ? w.head : hit.part === 'legs' ? 0.8 : hit.part === 'armor' ? 0.15 : 1), hit.point, hs, player); hitmark(hit.entity.dead, hs); }
  else impactFx(hit);
  flash.position.copy(mz); flash.material.rotation = rand(0, 6); const scoped = w.scope && adsAmt > 0.5; flash.scale.setScalar(rand(0.25, 0.45) * (w.kind === 'sniper' ? 1.6 : 1)); flash.visible = !scoped; flashT = 0.04; muzzleLight.position.copy(mz); muzzleLight.intensity = 40;
  recoilZ += w.kick; recoilX += w.recoil * 2; recoilPitch += w.recoil * (ads ? 0.6 : 1) * (player.crouch ? 0.8 : 1) * rand(0.8, 1.2); swayX += rand(-1, 1) * w.recoil * 0.5;
  if (vm) vm.play('fire', 0.03, Math.max(1, (vm.len.fire || 0.1) / Math.max(0.08, 60 / w.rpm)));
  const right = _a.set(1, 0, 0).applyQuaternion(camera.quaternion), sw = mz.clone().addScaledVector(right, 0.05).addScaledVector(dir, -0.4);
  sparks.spawn(sw.x, sw.y - 0.05, sw.z, right.x * rand(1.5, 2.5) + rand(-0.3, 0.3), rand(1.5, 2.5), right.z * rand(1.5, 2.5) + rand(-0.3, 0.3), 1, 0.06, 0.05, 1, 0.75, 0.3, 1, 0.5, 9);
  sfx.shot(w.kind); if (w.kind === 'sniper') sfx.boltCycle(0.45);
  for (const e of entities) if (e.isBot && !e.dead && e.team !== player.team && e.pos.distanceTo(player.pos) < D.hear) e.alertTo(player.pos, player);
  if (net.on) net.send({ t: 'shot', o: mz.toArray().map(v => +v.toFixed(2)), p: hit.point.toArray().map(v => +v.toFixed(2)), w: w.kind });
}
let hmT = 0; function hitmark(kill, hs) { const h = $('hitmarker'); h.className = 'show' + (kill ? ' kill' : '') + (hs ? ' hs' : ''); hmT = 0.12; sfx.hit(hs); if (kill) sfx.kill(); }
function popup(text, cls = '') { const d = document.createElement('div'); d.textContent = text; d.className = cls; d.style.top = rand(-26, 26) + 'px'; $('popups').appendChild(d); setTimeout(() => d.remove(), 1300); }
function addScore(n, label, cls) { player.score += n; player.xpEarned += n * (M.teams ? 1.2 : D.xp); popup('+' + n + ' ' + label, cls); }
function feed(a, b, hs, teamA, teamB) { const f = document.createElement('div'); f.innerHTML = `<span style="color:${TEAM[teamA].color}">${a}</span> <i>${hs ? '☠' : '✕'}</i> <span style="color:${TEAM[teamB].color}">${b}</span>`; if (hs) f.className = 'hs'; $('killfeed').prepend(f); setTimeout(() => f.remove(), 4500); while ($('killfeed').children.length > 6) $('killfeed').lastChild.remove(); }

// =====================================================================
// BOTS
// =====================================================================
let botNames = ['VIPER', 'GHOST', 'REAPER', 'HAWK', 'NOMAD', 'RAVEN', 'SABER', 'TITAN', 'WRAITH', 'ECHO', 'ORION', 'DRAKE', 'FALCON', 'JACKAL', 'KODIAK', 'LYNX', 'MAMBA', 'ONYX', 'PYRO', 'ROOK', 'STORM', 'VORTEX'];
class Bot {
  constructor(x, z, team, stats) {
    this.isBot = true; this.team = team; this.S = stats; this.name = botNames[randi(0, botNames.length - 1)] + '-' + randi(10, 99);
    this.pos = V3(x, getH(x, z), z); this.hp = stats.hp; this.dead = false; this.deadT = 0; this.seen = false; this.aware = false; this.known = V3(); this.alertT = 0; this.reactLeft = stats.react; this.ping = 0; this.target = null;
    this.burst = 0; this.fireCd = 0; this.strafeDir = 1; this.strafeT = 0; this.hold = false; this.wander = null; this.wanderT = 0; this.losT = Math.random() * 0.3; this.yaw = rand(0, 6.3); this.goal = null; this.role = Math.random() < 0.5 ? 'attack' : 'defend'; this.pref = Bot.count = (Bot.count || 0) + 1; this.flag = null; this.kills = 0; this.deaths = 0; this.respawnT = 0;
    this.vis = new Soldier(this, team); this.vis.g.position.copy(this.pos); this.vis.g.rotation.y = this.yaw; if (M.teams) this.vis.setTag(this.name, TEAM[team].color);
    entities.push(this);
  }
  get eye() { return _a.set(this.pos.x, this.pos.y + 1.6, this.pos.z); }
  eyePos() { return V3(this.pos.x, this.pos.y + 1.6, this.pos.z); }
  alertTo(p, who) { if (this.dead) return; this.known.copy(p); this.aware = true; this.alertT = Math.max(this.alertT, 6); if (this.reactLeft > this.S.react * 0.5) this.reactLeft = this.S.react * 0.5; if (who && !this.target) this.target = who; }
  canSee(e, dist, dx, dz) {
    if (dist > (this.aware ? this.S.detect * 1.6 : this.S.detect)) return false;
    if (!this.aware && dist > 5) { const fx = Math.sin(this.vis.g.rotation.y), fz = Math.cos(this.vis.g.rotation.y); if ((fx * dx + fz * dz) / dist < 0.2) return false; }
    return losClear(this.eyePos(), e.isPlayer ? playerAim() : e.eyePos());
  }
  pickTarget() {
    let best = null, bd = Infinity;
    for (const e of enemiesOf(this.team)) { const ep = e.isPlayer ? player.pos : e.pos, dx = ep.x - this.pos.x, dz = ep.z - this.pos.z, d = Math.hypot(dx, dz) || 0.001; if (d > bd || d > this.S.detect * 1.6) continue; if (this.canSee(e, d, dx, dz)) { best = e; bd = d; } }
    return best;
  }
  shoot(e, dist) {
    const m = this.vis.muzzle.getWorldPosition(_b).clone(); this.ping = 2.5; const S = this.S;
    const tgt = e.isPlayer ? playerAim() : e.eyePos();
    let acc = S.acc * clamp(1.15 - dist / S.range, 0.2, 1); if (e.isPlayer) acc *= (player.sprinting ? 0.7 : 1) * (player.onGround ? 1 : 0.6) * (player.crouch ? 0.8 : 1); else acc *= 0.75;
    const pan = panFor(m); let target;
    if (Math.random() < acc) { target = tgt.clone().add(V3(rand(-0.2, 0.2), rand(-0.3, 0.1), rand(-0.2, 0.2))); e.damage(S.dmg * rand(0.8, 1.2), m, false, this); }
    else { target = tgt.clone().add(V3(rand(-2.5, 2.5), rand(-1.5, 1), rand(-2.5, 2.5))); if (e.isPlayer && dist < 30) sfx.whizz(-pan); }
    tracer(m, target); burst(m, 3, 3, [1, 0.8, 0.4], 0.25, 0.1, 0); sfx.shot('ak', m.distanceTo(camera.position), pan);
  }
  damage(a, p, hs, attacker) {
    if (this.dead) return; this.hp -= a; burst(p, hs ? 14 : 8, 5, [0.55, 0.05, 0.03], 0.18, 0.5, 12);
    if (attacker) { this.alertTo(attacker.isPlayer ? player.pos : attacker.pos, attacker); this.target = attacker; } this.reactLeft = Math.min(this.reactLeft, 0.25);
    if (this.hp <= 0) this.die(hs, attacker);
  }
  die(hs, attacker) {
    this.dead = true; this.deadT = 0; this.deaths++; this.fall = Math.random() < 0.5 ? 1 : -1; this.respawnT = M.teams ? 6 : Infinity; this.ping = 0;
    if (this.flag) dropFlag(this.flag, this.pos);
    const an = attacker ? (attacker.isPlayer ? player.name : attacker.name) : 'ARTILLERY', at = attacker ? attacker.team : 1 - this.team;
    if (attacker === player) { player.kills++; if (hs) player.hs++; for (const k of loadout) ammo[k].reserve += WEAPONS[k].pickup; addScore(hs ? 150 : 100, hs ? 'HEADSHOT' : 'KILL', hs ? 'hs' : ''); if (this.S.alertAll) for (const b of entities) if (b.isBot && !b.dead && b.team !== player.team) b.alertTo(player.pos, player); }
    else if (attacker && attacker.isBot) attacker.kills++;
    if (M.teams && attacker && attacker.team !== this.team) { teamScore[attacker.team] += mode === 'tdm' ? 1 : 0; }
    feed(an, this.name, hs, at, this.team);
  }
  respawn() { const b = BASES[this.team]; let x, z; for (let t = 0; t < 30; t++) { x = clamp(b.x + rand(-14, 14), -MAP + 8, MAP - 8); z = clamp(b.z + rand(-14, 14), -MAP + 8, MAP - 8); if (freeSpot(x, z, 1)) break; } this.pos.set(x, getH(x, z), z); this.hp = this.S.hp; this.dead = false; this.aware = false; this.target = null; this.vis.g.rotation.x = 0; this.vis.g.position.copy(this.pos); if (M.teams) this.vis.setTag(this.name, TEAM[this.team].color); }
  remove() { this.vis.remove(); const i = entities.indexOf(this); if (i >= 0) entities.splice(i, 1); }
  objectiveGoal() {
    if (mode === 'ctf') { const my = flags[this.team], en = flags[1 - this.team]; if (this.flag) return BASES[this.team]; if (my.state === 'carried' && my.carrier && this.role === 'defend') return my.carrier.isPlayer ? player.pos : my.carrier.pos; if (my.state === 'dropped') return my.pos; if (this.role === 'attack' || en.state === 'dropped') return en.pos; return V3(my.home.x + rand(-6, 6), 0, my.home.z + rand(-6, 6)); }
    if (mode === 'dom') { const pref = DOM_POINTS[this.pref % 3]; if (pref.owner !== this.team) return pref.p; let best = null, bd = Infinity; for (const d of DOM_POINTS) { if (d.owner === this.team) continue; const dist = d.p.distanceTo(this.pos); if (dist < bd) { bd = dist; best = d; } } return best ? best.p : pref.p; }
    if (mode === 'tdm') { return player.team !== this.team ? player.pos : (this.wander ? V3(this.wander.x, 0, this.wander.z) : BASES[1 - this.team]); }
    return null;
  }
  update(dt) {
    if (this.ping > 0) this.ping -= dt;
    if (this.dead) { this.deadT += dt; this.vis.setDead(this.deadT, this.fall); if (this.respawnT !== Infinity) { this.respawnT -= dt; if (this.respawnT <= 0) this.respawn(); } else if (this.deadT > 12) { this.vis.g.position.y -= dt * 0.25; if (this.deadT > 16) this.remove(); } return; }
    const S = this.S;
    this.losT -= dt; if (this.losT <= 0) { this.losT = 0.2 + Math.random() * 0.1; const t = this.pickTarget(); if (t) { this.target = t; this.seen = true; } else { this.seen = false; if (this.target && (this.target.dead || (this.target.isPlayer && player.dead))) this.target = null; } }
    const tp = this.target ? (this.target.isPlayer ? player.pos : this.target.pos) : null;
    const dx = tp ? tp.x - this.pos.x : 0, dz = tp ? tp.z - this.pos.z : 0, dist = tp ? Math.hypot(dx, dz) || 0.001 : 1e9;
    if (this.seen && tp) { this.known.copy(tp); this.alertT = 8; if (!this.aware) { this.aware = true; this.reactLeft = S.react * rand(0.6, 1.4); for (const b of entities) if (b.isBot && b !== this && !b.dead && b.team === this.team && (S.alertAll || b.pos.distanceTo(this.pos) < 30)) b.alertTo(tp, this.target); } }
    else { this.alertT -= dt; if (this.alertT <= 0) this.aware = false; }
    let mx = 0, mz = 0, spd = S.speed, aimPitch = 0;
    const goal = this.objectiveGoal();
    if (this.seen && tp) {
      const nx = dx / dist, nz = dz / dist;
      this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = rand(0.8, 2.2); this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.hold = Math.random() < S.hold; }
      if (this.flag || (goal && mode === 'dom' && goal.distanceTo(this.pos) > 9 && this.hold)) { const ex = goal.x - this.pos.x, ez = goal.z - this.pos.z, ed = Math.hypot(ex, ez) || 1; mx = ex / ed; mz = ez / ed; }
      else if (dist > S.range * 0.8) { const ang = S.flank ? this.strafeDir * 0.7 : 0, c = Math.cos(ang), s = Math.sin(ang); mx = nx * c - nz * s; mz = nx * s + nz * c; }
      else if (dist < 7) { mx = -nx; mz = -nz; spd *= 0.8; }
      else if (!this.hold) { mx = -nz * this.strafeDir; mz = nx * this.strafeDir; spd *= S.strafe * 0.6; }
      this.reactLeft -= dt;
      if (this.reactLeft <= 0 && dist < S.range) { this.fireCd -= dt; if (this.fireCd <= 0) { if (this.burst > 0) { this.shoot(this.target, dist); this.burst--; this.fireCd = 0.1 + rand(0, 0.05); } else { this.burst = randi(S.burst[0], S.burst[1]); this.fireCd = S.pause * rand(0.6, 1.4); } } }
      this.yaw = Math.atan2(dx, dz); const ty = this.target.isPlayer ? camera.position.y : this.target.pos.y + 1.4; aimPitch = Math.atan2(ty - (this.pos.y + 1.42), dist);
    } else {
      this.burst = 0; let tx, tz;
      if (this.aware && this.known) { tx = this.known.x; tz = this.known.z; spd *= 1.1; }
      else if (goal) { tx = goal.x; tz = goal.z; spd *= mode === 'tdm' ? 0.75 : 1.0; if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 5) { this.wanderT -= dt; if (!this.wander || this.wanderT <= 0) { this.wander = { x: clamp(goal.x + rand(-10, 10), -MAP + 10, MAP - 10), z: clamp(goal.z + rand(-10, 10), -MAP + 10, MAP - 10) }; this.wanderT = rand(3, 7); } tx = this.wander.x; tz = this.wander.z; } }
      else { this.wanderT -= dt; if (!this.wander || this.wanderT <= 0) { this.wander = { x: clamp(this.pos.x + rand(-35, 35), -MAP + 10, MAP - 10), z: clamp(this.pos.z + rand(-35, 35), -MAP + 10, MAP - 10) }; this.wanderT = rand(6, 12); } tx = this.wander.x; tz = this.wander.z; spd *= 0.45; }
      const ex = tx - this.pos.x, ez = tz - this.pos.z, ed = Math.hypot(ex, ez);
      if (ed > 2.5) { mx = ex / ed; mz = ez / ed; this.yaw = Math.atan2(mx, mz); } else if (this.aware) this.alertT = Math.min(this.alertT, 1.5); else this.wanderT = 0;
    }
    if (mx || mz) {
      for (const o of obsBox(this.pos.x - 8, this.pos.z - 8, this.pos.x + 8, this.pos.z + 8)) { const ox = this.pos.x - o.x, oz = this.pos.z - o.z, d = Math.hypot(ox, oz), want = o.r + 2.2; if (d < want && d > 0.001) { const w = (want - d) / want; mx += ox / d * w * 1.6; mz += oz / d * w * 1.6; } }
      for (const b of entities) if (b !== this && !b.dead) { const ox = this.pos.x - b.pos.x, oz = this.pos.z - b.pos.z, d = Math.hypot(ox, oz); if (d < 2.5 && d > 0.001) { mx += ox / d * (2.5 - d) * 0.8; mz += oz / d * (2.5 - d) * 0.8; } }
      const l = Math.hypot(mx, mz) || 1; this.pos.x += mx / l * spd * dt; this.pos.z += mz / l * spd * dt; resolveCollision(this.pos, 0.45); pushVehicles(this.pos, 0.45);
    }
    this.pos.y = getH(this.pos.x, this.pos.z); this.vis.g.position.copy(this.pos); this.vis.g.rotation.y = lerpAngle(this.vis.g.rotation.y, this.yaw, 1 - Math.exp(-9 * dt));
    this.vis.animate(dt, !!(mx || mz), spd, aimPitch, false);
    if (mode === 'ctf') flagTouch(this);
  }
}
function spawnBots() {
  for (const e of entities.slice()) if (e.isBot) e.remove();
  if (!M.teams) { const n = Math.min(16, D.count + (wave - 1) * D.waveAdd); for (let i = 0; i < n; i++) { let x, z, ok = false; for (let t = 0; t < 40 && !ok; t++) { const a = rand(0, 6.3), r = rand(45, 95); x = clamp(player.pos.x + Math.cos(a) * r, -MAP + 10, MAP - 10); z = clamp(player.pos.z + Math.sin(a) * r, -MAP + 10, MAP - 10); ok = freeSpot(x, z, 1) && Math.hypot(x - player.pos.x, z - player.pos.z) > 35; } new Bot(x, z, 1, D); } banner('WAVE ' + wave, n + ' HOSTILES INBOUND'); sfx.jingle('wave'); return; }
  const friendly = Object.assign({}, DIFF.medium, { hp: 100, acc: 0.5 });
  for (let team = 0; team < 2; team++) for (let i = 0; i < M.bots - (team === 0 ? 1 : 0); i++) { const b = BASES[team]; let x, z; for (let t = 0; t < 30; t++) { x = clamp(b.x + rand(-16, 16), -MAP + 8, MAP - 8); z = clamp(b.z + rand(-16, 16), -MAP + 8, MAP - 8); if (freeSpot(x, z, 1)) break; } const bot = new Bot(x, z, team, team === 0 ? friendly : D); bot.role = i % 2 === 0 ? 'attack' : 'defend'; }
}

// =====================================================================
// OBJECTIVES: flags (CTF) and points (DOM)
// =====================================================================
const flags = [], objGroup = new THREE.Group(); scene.add(objGroup);
function makeFlag(team, neutral) {
  const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 })); pole.position.y = 1.6; g.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8, 12, 4), new THREE.MeshStandardMaterial({ color: neutral ? 0xdddddd : TEAM[team].hex, side: THREE.DoubleSide, roughness: 0.9, emissive: neutral ? 0x222222 : TEAM[team].hex, emissiveIntensity: 0.25 })); cloth.position.set(0.72, 2.75, 0); cloth.userData.wave = true; g.add(cloth);
  cloth.material.onBeforeCompile = sh => { sh.uniforms.uT = flagTime; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += sin(uT * 6.0 + position.x * 4.0) * 0.08 * (position.x + 0.7);'); };
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: neutral ? 0xffffff : TEAM[team].hex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 })); glow.scale.set(2.5, 2.5, 1); glow.position.y = 1.5; g.add(glow);
  g.userData.cloth = cloth; g.userData.glow = glow; objGroup.add(g); return g;
}
const flagTime = { value: 0 };
function setupObjectives() {
  while (objGroup.children.length) objGroup.remove(objGroup.children[0]); flags.length = 0;
  if (mode === 'ctf') for (let t = 0; t < 2; t++) { const home = BASES[t].clone(); home.y = getH(home.x, home.z); const f = { team: t, home, pos: home.clone(), state: 'home', carrier: null, dropT: 0, g: makeFlag(t, false) }; f.g.position.copy(home); flags.push(f); }
  if (mode === 'dom') for (const d of DOM_POINTS) { d.p.y = getH(d.p.x, d.p.z); d.owner = -1; d.progress = 0; d.g = makeFlag(0, true); d.g.position.copy(d.p); const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 7, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(d.p.x, d.p.y + 0.15, d.p.z); d.ring = ring; objGroup.add(ring); }
}
function dropFlag(f, at) { f.state = 'dropped'; f.carrier = null; f.pos.set(at.x, getH(at.x, at.z), at.z); f.dropT = 25; f.g.visible = true; f.g.position.copy(f.pos); if (f.team === player.team) { banner('FLAG DROPPED', 'RETURN IT'); } }
function flagTouch(e) {
  if (e.dead) return; const ep = e.isPlayer ? player.pos : e.pos;
  for (const f of flags) {
    if (f.state === 'carried') continue;
    if (ep.distanceTo(f.pos) < 2.3) {
      if (f.team !== e.team) { f.state = 'carried'; f.carrier = e; e.flag = f; f.g.visible = false; if (e.isPlayer) { banner('FLAG TAKEN', 'RETURN TO YOUR BASE'); sfx.jingle('flag'); addScore(50, 'FLAG TAKEN'); } else if (e.team !== player.team) { banner('ENEMY HAS YOUR FLAG', 'STOP THE CARRIER'); sfx.jingle('bad'); } }
      else if (f.state === 'dropped') { returnFlag(f); if (e.isPlayer) { addScore(100, 'FLAG RETURNED'); sfx.jingle('good'); } else if (e.team === player.team) banner('FLAG RETURNED'); }
    }
  }
  if (e.flag) { const home = BASES[e.team]; if (ep.distanceTo(home) < 4 && flags[e.team].state === 'home') { const f = e.flag; e.flag = null; returnFlag(f); teamScore[e.team]++; if (e.isPlayer) { player.caps++; addScore(500, 'FLAG CAPTURED', 'hs'); sfx.jingle('win'); } else sfx.jingle(e.team === player.team ? 'good' : 'lose'); banner((e.team === player.team ? 'YOUR TEAM' : 'ENEMY') + ' CAPTURED THE FLAG', teamScore[0] + ' – ' + teamScore[1]); } }
}
function returnFlag(f) { f.state = 'home'; f.carrier = null; f.pos.copy(f.home); f.g.position.copy(f.home); f.g.visible = true; }
let domTick = 0;
function updateObjectives(dt) {
  flagTime.value += dt;
  if (mode === 'ctf') { for (const f of flags) { if (f.state === 'dropped') { f.dropT -= dt; if (f.dropT <= 0) returnFlag(f); } if (f.state === 'carried' && f.carrier) { const cp = f.carrier.isPlayer ? player.pos : f.carrier.pos; f.pos.copy(cp); } } flagTouch(player); }
  if (mode === 'dom') {
    for (const d of DOM_POINTS) {
      let inside = [0, 0]; if (!player.dead && player.pos.distanceTo(d.p) < 7) inside[player.team]++; for (const e of entities) if (!e.dead && e.pos.distanceTo(d.p) < 7) inside[e.team]++;
      const t0 = inside[0] > 0, t1 = inside[1] > 0;
      if (t0 !== t1) { const team = t0 ? 0 : 1; if (d.owner === team) d.progress = Math.min(1, d.progress + dt * 0.3); else { d.progress -= dt * 0.25; if (d.progress <= 0) { const was = d.owner; d.owner = team; d.progress = 0.01; d.g.userData.cloth.material.color.set(TEAM[team].hex); d.g.userData.cloth.material.emissive.set(TEAM[team].hex); d.g.userData.glow.material.color.set(TEAM[team].hex); d.ring.material.color.set(TEAM[team].hex); if (team === player.team) { sfx.jingle('good'); banner('CAPTURED ' + d.n); if (inside[0] && player.pos.distanceTo(d.p) < 7) addScore(150, 'CAPTURED ' + d.n); } else { sfx.jingle('bad'); banner(was === player.team ? 'LOST ' + d.n : 'ENEMY TOOK ' + d.n); } } } }
      d.g.userData.glow.scale.setScalar(2 + Math.sin(flagTime.value * 3) * 0.3);
    }
    domTick += dt; if (domTick >= 2) { domTick -= 2; for (const d of DOM_POINTS) if (d.owner >= 0) teamScore[d.owner]++; }
  }
}

// =====================================================================
// MULTIPLAYER CLIENT
// =====================================================================
class RemotePlayer {
  constructor(info) { this.id = info.id; this.name = info.name; this.team = info.team; this.isRemote = true; this.pos = V3(...(info.p || [0, 0, 0])); this.tpos = this.pos.clone(); this.yaw = 0; this.tyaw = 0; this.pitch = 0; this.hp = 100; this.dead = !!info.dead; this.crouch = false; this.kills = info.k || 0; this.deaths = info.d || 0; this.vis = new Soldier(this, this.team); this.vis.setTag(this.name, TEAM[this.team].color); this.lastT = 0; entities.push(this); }
  eyePos() { return V3(this.pos.x, this.pos.y + (this.crouch ? 1.0 : 1.6), this.pos.z); }
  apply(s) { this.tk = Array.isArray(s.tk) ? s.tk : null; this.ti = s.ti; this.pl = s.pl || null; this.pi = s.pi; if (this.pl && s.pi >= 0 && planes[s.pi]) planes[s.pi].remoteT = 3; this.tpos.set(s.p[0], s.p[1], s.p[2]); this.tyaw = s.ry; this.pitch = s.rp; this.crouch = !!s.cr; this.hp = s.hp; this.dead = !!s.dead; this.kills = s.k; this.deaths = s.d; this.wkind = s.w; }
  damage(a, p, hs, attacker) { if (this.dead) return; burst(p, hs ? 14 : 8, 5, [0.55, 0.05, 0.03], 0.18, 0.5, 12); if (attacker === player) net.send({ t: 'hit', to: this.id, dmg: Math.round(a), hs: !!hs }); }
  updateJet(dt) {
    if (this.pl && !this.dead) {
      if (this.jet && this.jetKind !== (this.pl[7] | 0)) { entityGroup.remove(this.jet); this.jet = null; }
      if (!this.jet) { this.jetKind = this.pl[7] | 0; this.jet = (PLANE_KINDS[this.jetKind] || PLANE_KINDS[0]).build(); this.jet.traverse(o => { if (o.isMesh) { o.userData.entity = this; o.userData.part = 'body'; o.castShadow = true; } else if (o.isSprite) o.raycast = () => {}; }); entityGroup.add(this.jet); this.jet.position.set(this.pl[0], this.pl[1], this.pl[2]); this.jq = new THREE.Quaternion(); }
      this.jq.set(this.pl[3], this.pl[4], this.pl[5], this.pl[6]); this.jet.position.lerp(_a.set(this.pl[0], this.pl[1], this.pl[2]), 1 - Math.exp(-10 * dt)); this.jet.quaternion.slerp(this.jq, 1 - Math.exp(-10 * dt)); this.vis.g.visible = false; return true;
    }
    if (this.jet) { entityGroup.remove(this.jet); this.jet = null; } this.vis.g.visible = true; return false;
  }
  updateTank(dt) {
    const v = this.tk && !this.dead ? vehicles[this.ti] : null;
    if (this.tankV && this.tankV !== v) { this.tankV.remoteDriver = null; this.tankV = null; }
    if (!v || v === driver.tank) return false;
    this.tankV = v; v.remoteDriver = this; v.remoteT = 2; v.t.userData.driven = true; const k = 1 - Math.exp(-10 * dt);
    v.pos.lerp(_a.set(this.tk[0], this.tk[1], this.tk[2]), k); v.quat.slerp(_q1.set(this.tk[3], this.tk[4], this.tk[5], this.tk[6]), k); v.tYaw = lerpAngle(v.tYaw, this.tk[7], k); v.elev = lerp(v.elev, this.tk[8], k);
    v.t.position.copy(v.pos); v.t.quaternion.copy(v.quat); v.turret.rotation.y = v.tYaw; v.barrel.rotation.x = -v.elev; this.pos.copy(v.pos); this.vis.g.visible = false; return true;
  }
  update(dt) { if (this.updateJet(dt)) { this.pos.copy(this.jet.position); return; } if (this.updateTank(dt)) return; const moving = this.tpos.distanceToSquared(this.pos) > 0.0004; this.pos.lerp(this.tpos, 1 - Math.exp(-12 * dt)); this.yaw = lerpAngle(this.yaw, this.tyaw, 1 - Math.exp(-14 * dt)); this.vis.g.position.copy(this.pos); this.vis.g.rotation.y = this.yaw; if (this.dead) { this.deadT = (this.deadT || 0) + dt; this.vis.setDead(this.deadT, 1); } else { this.deadT = 0; this.vis.g.rotation.x = 0; this.vis.tag.visible = true; this.vis.animate(dt, moving, 5, this.pitch, this.crouch); } }
  remove() { this.vis.remove(); if (this.jet) entityGroup.remove(this.jet); const i = entities.indexOf(this); if (i >= 0) entities.splice(i, 1); }
}
const net = {
  ws: null, on: false, id: null, players: new Map(), sendT: 0, status: s => { $('netstatus').textContent = s; },
  connect(url, room, name, netMode) {
    this.disconnect(); let u = url.trim(); if (!u) return this.status('NO SERVER URL'); u = u.replace(/^http/, 'ws').replace(/\/$/, '');
    this.status('CONNECTING…'); let ws; try { ws = new WebSocket(`${u}/room/${encodeURIComponent(room || 'alpha')}?name=${encodeURIComponent(name || 'OPERATOR')}&mode=${netMode}`); } catch (e) { return this.status('BAD URL'); }
    this.ws = ws; ws.onopen = () => { this.on = true; this.status('CONNECTED · ' + room); };
    ws.onclose = () => { this.on = false; this.status('DISCONNECTED'); for (const r of this.players.values()) r.remove(); this.players.clear(); if (state === 'play' && mode === 'mp') toLobby(); };
    ws.onerror = () => this.status('CONNECTION FAILED');
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this.handle(m); };
  },
  disconnect() { if (this.ws) { this.ws.onclose = null; this.ws.close(); } this.ws = null; this.on = false; for (const r of this.players.values()) r.remove(); this.players.clear(); },
  send(o) { if (this.on && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  handle(m) {
    switch (m.t) {
      case 'welcome': this.id = m.id; player.team = m.team; this.netMode = m.mode; this.scores = m.scores || [0, 0]; this.target = m.target || 30; for (const p of m.players) if (p.id !== m.id) this.players.set(p.id, new RemotePlayer(p)); this.status(`CONNECTED · ${m.room} · ${m.mode.toUpperCase()} · ${m.players.length} ONLINE`); break;
      case 'join': if (m.p.id !== this.id) { this.players.set(m.p.id, new RemotePlayer(m.p)); feed('', m.p.name + ' JOINED', false, m.p.team, m.p.team); } break;
      case 'leave': { const r = this.players.get(m.id); if (r) { r.remove(); this.players.delete(m.id); } break; }
      case 'state': for (const s of m.players) { if (s.id === this.id) continue; let r = this.players.get(s.id); if (!r) { r = new RemotePlayer(s); this.players.set(s.id, r); } r.apply(s); } if (m.scores) this.scores = m.scores; break;
      case 'shot': { const r = this.players.get(m.id); if (!r) break; const o = V3(...m.o), p = V3(...m.p); if (m.w === 'tank') { burst(o, 40, 14, [1, 0.7, 0.3], 1.2, 0.3, 0); puffSmoke(o, 14, 2, 8, 0.4, [2, 4], 1.5, 1, 0.5); sfx.tankShot(o.distanceTo(camera.position), panFor(o)); break; } tracer(o, p); burst(o, 3, 3, [1, 0.8, 0.4], 0.25, 0.1, 0); sfx.shot(m.w || 'ak', o.distanceTo(camera.position), panFor(o)); if (!r.dead) r.ping = 2; break; }
      case 'hit': { const r = this.players.get(m.from); if (player.dead) break; player.damage(m.dmg, r ? r.pos : null, r); if (m.hs) {} break; }
      case 'kill': { const a = this.players.get(m.killer), v = this.players.get(m.victim); const an = m.killer === this.id ? player.name : a ? a.name : '?', vn = m.victim === this.id ? player.name : v ? v.name : '?'; feed(an, vn, m.hs, m.kt, m.vt); if (m.killer === this.id) { player.kills++; if (m.hs) player.hs++; addScore(m.hs ? 150 : 100, m.hs ? 'HEADSHOT' : 'KILL', m.hs ? 'hs' : ''); hitmark(true, m.hs); } break; }
      case 'boom': { const r = this.players.get(m.id); world.explode(V3(...m.p), !!m.big, r || null); break; }
      case 'chat': popup(m.name + ': ' + m.text); break;
      case 'end': { matchOver = true; winner = m.winner; endMatch(this.netMode === 'ffa' ? (m.winner === this.id ? 0 : 1) : m.winner); break; }
    }
  },
  update(dt) { if (!this.on) return; this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 1 / 15; this.send({ t: 's', p: player.pos.toArray().map(v => +v.toFixed(2)), ry: +player.yaw.toFixed(3), rp: +player.pitch.toFixed(3), cr: player.crouch ? 1 : 0, hp: Math.round(player.hp), w: cur().kind, dead: player.dead ? 1 : 0, pl: pilot.plane ? planeNet(pilot.plane) : 0, pi: pilot.plane ? planes.indexOf(pilot.plane) : -1, tk: driver.tank ? tankNet(driver.tank) : 0, ti: driver.tank ? vehicles.indexOf(driver.tank) : -1 }); } for (const r of this.players.values()) r.update(dt); },
};

// =====================================================================
// GAME FLOW
// =====================================================================
function refreshProfile() {
  const lvl = levelOf(career.xp), into = career.xp % 1000;
  $('emblem').textContent = lvl; $('rankname').textContent = RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 3))]; $('xpfill').style.width = (into / 10) + '%'; $('xptext').textContent = `${into} / 1000 XP · LEVEL ${lvl}`; $('pname').textContent = settings.name;
  for (const [k, v] of Object.entries({ 'c-kills': career.kills, 'c-hs': career.hs, 'c-matches': career.matches, 'c-wave': career.bestWave, 'c-xp': career.xp, 'c-score': career.bestScore, 'c-wins': career.wins })) if ($(k)) $(k).textContent = v;
}
function resetGame(isNet) {
  for (const e of entities.slice()) if (e.isBot) e.remove();
  mode = isNet ? 'mp' : settings.mode; M = isNet ? { name: net.netMode === 'ffa' ? 'FREE FOR ALL' : 'TEAM DEATHMATCH', teams: net.netMode === 'tdm', target: net.target || 30, bots: 0 } : MODES[mode]; D = DIFF[settings.diff] || DIFF.medium;
  loadout = [settings.primary, settings.secondary]; curSlot = 0; resetAmmo(); reloadT = switchT = boltT = 0; wave = 1; waveT = 0; teamScore = [0, 0]; matchT = 0; matchOver = false; winner = -1;
  Object.assign(player, { hp: 100, dead: false, kills: 0, hs: 0, deaths: 0, score: 0, xpEarned: 0, caps: 0, crouch: false, flag: null, team: isNet ? player.team : 0, name: settings.name });
  spawnPlayer(); document.querySelectorAll('#wslots .slot').forEach((s, k) => { s.classList.toggle('sel', k === 0); s.textContent = (k + 1) + '  ' + WEAPONS[loadout[k]].name; });
  $('death').classList.add('hidden'); $('end').classList.add('hidden'); $('killfeed').innerHTML = ''; career.matches++; saveCareer();
  setupObjectives(); setupPlanes(); leaveTank(true); for (const v of vehicles) resetTank(v); for (const sh of tShells) scene.remove(sh.s); tShells.length = 0; if (!isNet) spawnBots(); if (isNet) banner(M.name, 'FIRST TO ' + M.target); else if (M.teams) { banner(M.name, M.sub); sfx.jingle('wave'); }
  for (const vm of Object.values(vms)) vm.root.visible = false;
}
function spawnPlayer() {
  const b = M.teams || mode === 'mp' ? BASES[player.team] : V3(0, 0, 4); let x = b.x, z = b.z; if (mode !== 'survival') for (let t = 0; t < 30; t++) { x = clamp(b.x + rand(-12, 12), -MAP + 8, MAP - 8); z = clamp(b.z + rand(-12, 12), -MAP + 8, MAP - 8); if (freeSpot(x, z, 1)) break; }
  if (mode === 'mp' && !M.teams) { x = rand(-120, 120); z = rand(-120, 120); }
  player.pos.set(x, getH(x, z), z); player.vel.set(0, 0, 0); player.yaw = Math.atan2(-x, -z) + Math.PI; player.pitch = 0; player.hp = 100; player.dead = false; player.lastHit = -99; player.eyeH = 1.7; $('vignette').style.opacity = 0;
}
function play() { state = 'play'; $('lobby').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden'); sfx.resume(); hadLock = false; lockPointer(); }
function pause() { if (state !== 'play') return; state = 'pause'; $('pause').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); }
function toLobby() { leavePlane(true); leaveTank(true); for (const p of planes) scene.remove(p.g); planes.length = 0; state = 'menu'; for (const e of entities.slice()) if (e.isBot) e.remove(); while (objGroup.children.length) objGroup.remove(objGroup.children[0]); flags.length = 0; for (const id of ['pause', 'death', 'end', 'hud']) $(id).classList.add('hidden'); $('lobby').classList.remove('hidden'); refreshProfile(); if (document.pointerLockElement) document.exitPointerLock(); }
function bankXp() { const xp = Math.round(player.xpEarned); career.xp += xp; career.kills += player.kills; career.hs += player.hs; career.bestWave = Math.max(career.bestWave, mode === 'survival' ? wave : 0); career.bestScore = Math.max(career.bestScore, player.score); saveCareer(); return xp; }
function die(attacker) {
  if (pilot.plane) { const pl = pilot.plane; leavePlane(true); destroyPlane(pl, true); }
  if (driver.tank) destroyTank(driver.tank);
  player.dead = true; player.deaths++; player.deadT = 0; if (player.flag) { dropFlag(player.flag, player.pos); player.flag = null; }
  if (attacker && attacker.isBot) { attacker.kills++; if (mode === 'tdm') teamScore[attacker.team]++; feed(attacker.name, player.name, false, attacker.team, player.team); }
  if (net.on) net.send({ t: 'died', by: attacker && attacker.isRemote ? attacker.id : null, hs: false });
  if (mode === 'survival') { state = 'dead'; const xp = bankXp(); $('deathstats').innerHTML = `<div><b>${player.score}</b><span>SCORE</span></div><div><b>${player.kills}</b><span>KILLS</span></div><div><b>${wave}</b><span>WAVE</span></div>`; $('xpgain').textContent = `+${xp} XP · ${settings.diff.toUpperCase()}`; $('death').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); sfx.jingle('lose'); }
  else { player.respawnT = 5; sfx.jingle('bad'); }
}
function endMatch(winTeam) {
  matchOver = true; winner = winTeam; state = 'dead'; const won = winTeam === player.team; if (won) career.wins++; const xp = bankXp() + (won ? 500 : 0); if (won) { career.xp += 500; saveCareer(); }
  $('endtitle').textContent = won ? 'VICTORY' : 'DEFEAT'; $('endtitle').className = won ? 'win' : 'lose';
  $('endstats').innerHTML = `<div><b>${M.teams ? teamScore[player.team] + ' – ' + teamScore[1 - player.team] : player.kills}</b><span>${M.teams ? 'SCORE' : 'KILLS'}</span></div><div><b>${player.kills}</b><span>KILLS</span></div><div><b>${player.deaths}</b><span>DEATHS</span></div>`;
  $('endxp').textContent = `+${xp} XP${won ? ' · WIN BONUS' : ''}`; $('end').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); sfx.jingle(won ? 'win' : 'lose'); refreshProfile();
}
let hadLock = false, lockFailT = 0;
function lockPointer() { try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => { lockFailT = now; $('lockhint').classList.remove('hidden'); }); } catch (e) { lockFailT = now; $('lockhint').classList.remove('hidden'); } }
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) { hadLock = true; $('lockhint').classList.add('hidden'); } else if (hadLock && state === 'play') pause(); });
document.addEventListener('pointerlockerror', () => { lockFailT = now; $('lockhint').classList.remove('hidden'); });

// =====================================================================
// INPUT
// =====================================================================
addEventListener('keydown', e => { if (e.code === 'Tab') { e.preventDefault(); scoreboard = true; } if (e.repeat) return; keys[e.code] = true; if (state !== 'play') return; if (e.code === 'KeyF') useVehicle(); if (pilot.plane || driver.tank) return; if (e.code === 'KeyR') startReload(); if (e.code === 'Digit1') setSlot(0); if (e.code === 'Digit2') setSlot(1); if (e.code === 'KeyC' && settings.crouch === 'toggle') player.crouch = !player.crouch; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Tab') scoreboard = false; });
addEventListener('mousemove', e => { if (state !== 'play') return; if (!document.pointerLockElement && (Math.abs(e.movementX) > 200 || Math.abs(e.movementY) > 200)) return; if (pilot.plane) { pilot.mdx += e.movementX * settings.sens; pilot.mdy += e.movementY * settings.sens; return; } if (driver.tank) { driver.mdx += e.movementX * settings.sens * (ads ? 0.45 : 1); driver.mdy += e.movementY * settings.sens * (ads ? 0.45 : 1); return; } const s = 0.0022 * settings.sens * (adsAmt > 0.5 ? (cur().scope ? 0.25 : 0.6) : 1); player.yaw -= e.movementX * s; player.pitch = clamp(player.pitch - e.movementY * s, -1.5, 1.5); mdx += e.movementX; });
addEventListener('mousedown', e => { if (state !== 'play') return; if (!document.pointerLockElement) { lockPointer(); if (!hadLock) return; } if (e.button === 0) { mouseDown = true; triggerHeld = false; } if (e.button === 2) ads = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) ads = false; });
addEventListener('wheel', () => { if (state === 'play') setSlot(1 - curSlot); });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; ads = false; scoreboard = false; });

// =====================================================================
// UPDATE: PLAYER / WEAPON
// =====================================================================
function updatePlayer(dt) {
  if (player.dead) { player.deadT += dt; player.respawnT -= dt; $('respawn').classList.remove('hidden'); $('respawn').innerHTML = `REDEPLOYING IN <b>${Math.max(0, Math.ceil(player.respawnT))}</b>`; if (player.respawnT <= 0 && !matchOver) { spawnPlayer(); $('respawn').classList.add('hidden'); } camera.position.set(player.pos.x, player.pos.y + 0.4, player.pos.z); return; }
  $('respawn').classList.add('hidden');
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (settings.crouch === 'hold') player.crouch = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight);
  player.sprinting = !!keys.ShiftLeft && fwd > 0 && !ads && reloadT <= 0 && !player.crouch;
  const spd = player.crouch ? 2.4 : player.sprinting ? 8.2 : ads ? 3.4 : 5.4, sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  let vx = (-sy * fwd + cy * str), vz = (-cy * fwd - sy * str); const l = Math.hypot(vx, vz) || 1; if (fwd || str) { vx = vx / l * spd; vz = vz / l * spd; } else vx = vz = 0;
  const k = 1 - Math.exp(-(player.onGround ? 12 : 2.5) * dt); player.vel.x = lerp(player.vel.x, vx, k); player.vel.z = lerp(player.vel.z, vz, k);
  if (keys.Space && player.onGround && !player.crouch) { player.vel.y = 6.5; player.onGround = false; }
  player.vel.y -= 20 * dt; player.pos.addScaledVector(player.vel, dt);
  const h = getH(player.pos.x, player.pos.z); if (player.pos.y <= h) { if (!player.onGround && player.vel.y < -6) sfx.step(true, false); player.pos.y = h; player.vel.y = 0; player.onGround = true; }
  resolveCollision(player.pos, 0.5); pushVehicles(player.pos, 0.5);
  const moving = player.onGround && Math.hypot(player.vel.x, player.vel.z) > 0.5;
  if (moving) { player.walkT += dt * (player.sprinting ? 11 : player.crouch ? 5 : 8); player.stepPhase += dt * (player.sprinting ? 3.6 : player.crouch ? 1.6 : 2.4); if (player.stepPhase >= 1) { player.stepPhase -= 1; sfx.step(player.sprinting, player.crouch); } }
  moveSpread = lerp(moveSpread, moving ? (player.sprinting ? 1.2 : 0.5) : (player.onGround ? 0 : 1), 1 - Math.exp(-8 * dt));
  player.eyeH = lerp(player.eyeH, player.crouch ? 1.0 : 1.7, 1 - Math.exp(-10 * dt));
  camera.position.set(player.pos.x, player.pos.y + player.eyeH + (moving ? Math.sin(player.walkT) * 0.035 : 0), player.pos.z);
  if (now - player.lastHit > 4.5 && player.hp < 100) player.hp = Math.min(100, player.hp + 9 * dt);
  $('vignette').style.opacity = clamp(Math.max(parseFloat($('vignette').style.opacity || 0) - dt * 1.2, player.hp < 35 ? 0.35 + (1 - player.hp / 35) * 0.3 : 0), 0, 1);
  if (dmgDirT > 0) { dmgDirT -= dt; $('dmgdir').style.opacity = clamp(dmgDirT, 0, 1); }
}
function updateWeapon(dt) {
  const w = cur(), vm = vmFor(w.key);
  if (switchT > 0) { switchT -= dt; if (switchT <= 0) switchT = 0; }
  for (const k in vms) vms[k].root.visible = (k === w.key) && !player.dead;
  if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) { reloadT = 0; const a = ammo[w.key], take = Math.min(w.mag - a.mag, a.reserve); a.mag += take; a.reserve -= take; } }
  if (boltT > 0) boltT -= dt;
  fireCd -= dt;
  if (mouseDown && fireCd <= 0 && state === 'play' && !matchOver && (w.auto || !triggerHeld)) { playerFire(); triggerHeld = true; }
  if (!mouseDown) triggerHeld = false;
  const k = 1 - Math.exp(-14 * dt), canAds = ads && reloadT <= 0 && switchT <= 0 && !player.sprinting;
  adsAmt = lerp(adsAmt, canAds ? 1 : 0, k);
  if (vm) vm.update(dt);
  camera.fov = lerp(camera.fov, canAds ? w.fov : settings.fov, k); camera.updateProjectionMatrix();
  $('xh').style.opacity = canAds ? 0 : 1; $('reddot').classList.toggle('show', canAds && vm && vm.reddot && adsAmt > 0.95);
  const moving = player.onGround && Math.hypot(player.vel.x, player.vel.z) > 0.5, bobA = canAds ? 0.2 : 1;
  const bx = moving ? Math.sin(player.walkT * 0.5) * 0.014 * bobA : 0, by = moving ? Math.abs(Math.cos(player.walkT * 0.5)) * 0.012 * bobA : 0;
  swayX = lerp(swayX, -mdx * 0.0007, 1 - Math.exp(-10 * dt)); mdx = 0;
  recoilZ *= Math.exp(-12 * dt); recoilX *= Math.exp(-14 * dt); recoilPitch *= Math.exp(-10 * dt);
  let ry = 0, rx = 0, dy = 0; if (player.sprinting && !canAds) { ry = 0.45; rx = -0.3; dy = -0.05; }
  if (vm && !vm.mixer) { if (reloadT > 0) { const t = 1 - reloadT / w.reload; rx = -0.9 * Math.sin(Math.PI * t); dy = -0.12 * Math.sin(Math.PI * t); } if (switchT > 0) dy = -0.35 * Math.sin(Math.PI * switchT / 0.55); }
  if (vm) { vm.root.position.set(bx + recoilX * 0.1, by + dy, recoilZ * (1 - adsAmt * 0.5)); vm.root.rotation.set(lerp(vm.root.rotation.x, rx + recoilX * 0.5, k), lerp(vm.root.rotation.y, (ry + swayX) * (1 - adsAmt * 0.8), k), lerp(vm.root.rotation.z, (swayX * 0.5 + bx * 2) * (1 - adsAmt), k)); }
  if (vm) alignSights(vm, k);
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) flash.visible = false; }
  muzzleLight.intensity *= Math.exp(-40 * dt);
  const a = ammo[w.key]; $('mag').textContent = a.mag; $('mag').classList.toggle('low', a.mag <= w.mag * 0.25); $('reserve').textContent = a.reserve; $('wname').textContent = w.name; $('wmode').textContent = w.mode; $('wicon').innerHTML = WICON[w.kind];
  xhSpread = Math.min(22, (canAds ? w.adsSpread : w.spread) * (1 + moveSpread * 1.5) * (player.crouch ? 0.7 : 1) * 320 + recoilPitch * 90);
}

// Aim-down-sights solver: every frame the rear and front sight (or the optic axis) of the CURRENT animated pose are
// measured and the weapon is rotated + moved so that line lies exactly on the camera's view axis. Idle sway, recoil and
// fire animations can never pull the sights off centre while aiming.
const wrHip = V3(), _sr = V3(), _sf = V3(), _sd = V3(), _st = V3(), _sq = new THREE.Quaternion(), VIEW_AXIS = V3(0, 0, -1);
function alignSights(vm, k) {
  wrHip.lerp(vm.hip, k); weaponRoot.position.copy(wrHip); weaponRoot.quaternion.identity();
  if (!vm.sightRear || adsAmt < 0.001) return;
  vm.sightRear.getWorldPosition(_sr); weaponRoot.worldToLocal(_sr); vm.sightFront.getWorldPosition(_sf); weaponRoot.worldToLocal(_sf);   // weapon-root space == camera space minus wrHip
  _sd.copy(_sf).sub(_sr).normalize(); _sq.setFromUnitVectors(_sd, VIEW_AXIS);
  _st.set(0, 0, -vm.relief - recoilZ * 0.35).sub(_sr.applyQuaternion(_sq));   // position that puts the rear sight on the axis
  const t = smooth(clamp(adsAmt, 0, 1)); weaponRoot.position.lerp(_st, t); weaponRoot.quaternion.slerp(_sq, t);
}

// =====================================================================
// HUD
// =====================================================================
const WICON = {
  ak: '<svg viewBox="0 0 120 40"><path d="M2 20h30l4-4h40l6 3h20l6-5h10v6h-8l-4 4h-26l-3 4h-10l-2 8h-8l2-8H36l-2 6h-8l2-6H2z"/><path d="M50 23l-4 12h8l3-12z"/></svg>',
  ar: '<svg viewBox="0 0 120 40"><path d="M4 18h26l3-5h28l4 5h30l8-4h12v6h-10l-6 4h-28l-3 6h-10l-2 8h-7l2-8H40l-3 6h-8l3-6H4z"/><path d="M58 10h10v6H58z"/></svg>',
  sniper: '<svg viewBox="0 0 120 40"><path d="M2 22h16l3-5h20l4-5h14l2 5h50l6-3h3v5h-4l-5 4h-44l-3 5h-14l-3 8h-7l3-8H24l-2 6h-8l2-6H2z"/><path d="M44 8h22l-2 5H46z"/></svg>',
  pistol: '<svg viewBox="0 0 120 40"><path d="M30 10h60v10h-34l-2 4h-6l-4 14h-16l4-14h-4z"/></svg>',
};
const xhc = $('xh').getContext('2d'); let xhSpread = 6;
function drawCrosshair() {
  const S = 96, c = xhc, cx = S / 2, cy = S / 2, st = settings, size = 7 * st.xhSize, gap = (st.xhDynamic ? 3 + xhSpread : 5) * st.xhGap, th = 2, col = st.xhColor;
  c.clearRect(0, 0, S, S); c.lineCap = 'butt';
  const stroke = (fn) => { if (st.xhOutline) { c.strokeStyle = 'rgba(0,0,0,.85)'; c.lineWidth = th + 2; fn(); c.stroke(); } c.strokeStyle = col; c.lineWidth = th; fn(); c.stroke(); };
  const lines = (dirs) => { for (const [dx, dy] of dirs) stroke(() => { c.beginPath(); c.moveTo(cx + dx * gap, cy + dy * gap); c.lineTo(cx + dx * (gap + size), cy + dy * (gap + size)); }); };
  if (st.xhStyle === 'cross') lines([[0, -1], [0, 1], [-1, 0], [1, 0]]);
  else if (st.xhStyle === 't') lines([[0, 1], [-1, 0], [1, 0]]);
  else if (st.xhStyle === 'chevron') { stroke(() => { c.beginPath(); c.moveTo(cx - size, cy + gap + size * 0.6); c.lineTo(cx, cy + gap); c.lineTo(cx + size, cy + gap + size * 0.6); }); }
  else if (st.xhStyle === 'circle') { stroke(() => { c.beginPath(); c.arc(cx, cy, gap + 2, 0, Math.PI * 2); }); }
  else if (st.xhStyle === 'brackets') { stroke(() => { c.beginPath(); c.moveTo(cx - gap - size, cy - size); c.lineTo(cx - gap - size, cy + size); c.moveTo(cx + gap + size, cy - size); c.lineTo(cx + gap + size, cy + size); }); }
  if (st.xhDot || st.xhStyle === 'dot') { if (st.xhOutline) { c.fillStyle = 'rgba(0,0,0,.85)'; c.beginPath(); c.arc(cx, cy, 2.4, 0, 7); c.fill(); } c.fillStyle = col; c.beginPath(); c.arc(cx, cy, 1.5, 0, 7); c.fill(); }
}
const mmc = $('minimap').getContext('2d'), cpc = $('compass').getContext('2d');
function drawHUD() {
  const S = 170, zoom = S / 130, yaw = player.yaw, rot = -Math.PI / 2 - Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
  mmc.clearRect(0, 0, S, S); mmc.save(); mmc.beginPath(); mmc.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); mmc.clip();
  mmc.translate(S / 2, S / 2); mmc.rotate(rot); mmc.scale(zoom, zoom); mmc.translate(-player.pos.x, -player.pos.z);
  mmc.drawImage(mapImg, -MAP, -MAP, 2 * MAP, 2 * MAP);
  mmc.fillStyle = 'rgba(160,170,150,.35)'; for (const t of tanks) mmc.fillRect(t.position.x - 2.5, t.position.z - 2.5, 5, 5);
  if (mode === 'ctf') for (const f of flags) { mmc.fillStyle = TEAM[f.team].color; mmc.beginPath(); mmc.moveTo(f.pos.x, f.pos.z - 4); mmc.lineTo(f.pos.x + 4, f.pos.z - 2); mmc.lineTo(f.pos.x, f.pos.z); mmc.closePath(); mmc.fill(); mmc.fillRect(f.pos.x - 0.6, f.pos.z - 4, 1.2, 6); }
  if (mode === 'dom') for (const d of DOM_POINTS) { mmc.fillStyle = d.owner >= 0 ? TEAM[d.owner].color : '#ddd'; mmc.beginPath(); mmc.arc(d.p.x, d.p.z, 4, 0, 7); mmc.fill(); mmc.fillStyle = '#000'; mmc.font = 'bold 6px sans-serif'; mmc.textAlign = 'center'; mmc.save(); mmc.translate(d.p.x, d.p.z); mmc.rotate(-rot); mmc.fillText(d.n, 0, 2); mmc.restore(); }
  if (M.teams || mode === 'mp') for (const b of [0, 1]) { mmc.strokeStyle = TEAM[b].color; mmc.lineWidth = 1.5; mmc.beginPath(); mmc.arc(BASES[b].x, BASES[b].z, 10, 0, 7); mmc.stroke(); }
  for (const e of entities) { if (e.dead) continue; const friendly = e.team === player.team; const show = friendly || D.radar === 'always' || e.ping > 0; if (!show) continue; mmc.fillStyle = friendly ? TEAM[player.team].color : (e.ping > 0 ? '#ff3b2e' : 'rgba(255,80,60,.8)'); mmc.beginPath(); mmc.arc(e.pos.x, e.pos.z, friendly ? 1.6 : 2, 0, 7); mmc.fill(); }
  mmc.restore();
  mmc.save(); mmc.translate(S / 2, S / 2); mmc.fillStyle = '#fff'; mmc.beginPath(); mmc.moveTo(0, -7); mmc.lineTo(5, 6); mmc.lineTo(0, 3); mmc.lineTo(-5, 6); mmc.closePath(); mmc.fill(); mmc.rotate(rot); mmc.fillStyle = '#4fc3ff'; mmc.font = 'bold 11px Bahnschrift, sans-serif'; mmc.textAlign = 'center'; mmc.fillText('N', 0, -S / 2 + 14); mmc.restore();
  const W = 420, H = 34; cpc.clearRect(0, 0, W, H); const headDeg = ((-yaw * 180 / Math.PI) % 360 + 360) % 360, base = Math.round(headDeg / 15) * 15;
  cpc.textAlign = 'center'; cpc.textBaseline = 'middle';
  for (let k = -6; k <= 6; k++) { const d = base + k * 15 - headDeg, deg = ((base + k * 15) % 360 + 360) % 360, x = W / 2 + d * 2.2, fade = clamp(1 - Math.abs(d) / 95, 0, 1), lbl = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[deg]; cpc.fillStyle = `rgba(255,255,255,${fade * (lbl ? 1 : 0.5)})`; if (lbl) { cpc.font = `bold ${lbl.length > 1 ? 10 : 13}px Bahnschrift, sans-serif`; cpc.fillText(lbl, x, 14); } else cpc.fillRect(x - 0.5, 10, 1, 7); }
  // objective markers on the compass
  const mark = (p, col, txt) => { const ang = ((Math.atan2(p.x - player.pos.x, -(p.z - player.pos.z)) * 180 / Math.PI + yaw * 180 / Math.PI) % 360 + 360) % 360; let d = ang > 180 ? ang - 360 : ang; if (Math.abs(d) > 95) return; cpc.fillStyle = col; cpc.font = 'bold 10px Bahnschrift, sans-serif'; cpc.fillText(txt, W / 2 + d * 2.2, 27); };
  if (mode === 'ctf') for (const f of flags) mark(f.pos, TEAM[f.team].color, '⚑'); if (mode === 'dom') for (const d of DOM_POINTS) mark(d.p, d.owner >= 0 ? TEAM[d.owner].color : '#fff', d.n); if (M.teams && mode !== 'dom') mark(BASES[1 - player.team], TEAM[1 - player.team].color, '◆');
  cpc.fillStyle = '#4fc3ff'; cpc.fillRect(W / 2 - 1, 2, 2, 8);
  drawCrosshair();
}
function updateHUDText() {
  const alive = entities.filter(e => !e.dead && e.team !== player.team).length;
  $('hpfill').style.width = player.hp + '%'; $('hpfill').classList.toggle('low', player.hp < 35); $('hptext').textContent = Math.ceil(player.hp); $('stance').textContent = player.crouch ? 'CROUCHED' : player.sprinting ? 'SPRINTING' : 'STANDING';
  const top = $('modebar');
  if (mode === 'survival') top.innerHTML = `<div class="surv"><span>WAVE</span><b>${wave}</b><span>HOSTILES</span><b>${alive}</b><span>SCORE</span><b>${player.score}</b></div>`;
  else if (mode === 'mp' && !M.teams) { const list = [...net.players.values()].map(r => ({ n: r.name, k: r.kills })).concat([{ n: player.name, k: player.kills }]).sort((a, b) => b.k - a.k).slice(0, 3); top.innerHTML = `<div class="ffa">${list.map(x => `<span>${x.n} <b>${x.k}</b></span>`).join('')}<i>/ ${M.target}</i></div>`; }
  else { const s = mode === 'mp' ? (net.scores || [0, 0]) : teamScore, t0 = player.team, t1 = 1 - t0, tgt = M.target; top.innerHTML = `<div class="teams"><div class="tm t0" style="--c:${TEAM[t0].color}"><span>${TEAM[t0].name}</span><b>${s[t0]}</b><i style="width:${clamp(s[t0] / tgt * 100, 0, 100)}%"></i></div><div class="tgt">${tgt}</div><div class="tm t1" style="--c:${TEAM[t1].color}"><b>${s[t1]}</b><span>${TEAM[t1].name}</span><i style="width:${clamp(s[t1] / tgt * 100, 0, 100)}%"></i></div></div>` + (mode === 'dom' ? `<div class="dom">${DOM_POINTS.map(d => `<span style="--c:${d.owner >= 0 ? TEAM[d.owner].color : '#999'}">${d.n}</span>`).join('')}</div>` : mode === 'ctf' ? `<div class="ctf">${flags.map(f => `<span style="--c:${TEAM[f.team].color}" class="${f.state}">⚑ ${f.state === 'home' ? 'SAFE' : f.state === 'carried' ? 'TAKEN' : 'DROPPED'}</span>`).join('')}</div>` : ''); }
  let prompt = ''; const nearP = !pilot.plane && !player.dead ? nearPlane() : null; const nearT = !pilot.plane && !driver.tank && !player.dead ? nearTank() : null; if (pilot.plane) prompt = pilot.plane.onGround && pilot.plane.speed < 15 ? 'F  EXIT AIRCRAFT' : ''; else if (driver.tank) prompt = ''; else if (nearT && (!nearP || nearT.pos.distanceTo(player.pos) < nearP.pos.distanceTo(player.pos))) prompt = 'PRESS  F  TO DRIVE TANK'; else if (nearP) prompt = 'PRESS  F  TO FLY ' + nearP.cfg.name; else if (player.flag) prompt = 'RETURN THE FLAG TO YOUR BASE'; else if (mode === 'dom') { for (const d of DOM_POINTS) if (player.pos.distanceTo(d.p) < 7) prompt = d.owner === player.team && d.progress >= 1 ? 'HOLDING ' + d.n : 'CAPTURING ' + d.n + ' ' + Math.round(clamp(d.owner === player.team ? d.progress : 1 - d.progress, 0, 1) * 100) + '%'; } $('prompt').textContent = prompt;
  $('scoreboard').classList.toggle('hidden', !scoreboard);
  if (scoreboard) { const rows = []; const push = (n, k, d, team, me) => rows.push({ n, k, d, team, me }); push(player.name, player.kills, player.deaths, player.team, true); for (const e of entities) push(e.name, e.kills || 0, e.deaths || 0, e.team, false); rows.sort((a, b) => b.k - a.k);
    const tbl = t => `<table><tr><th>${TEAM[t].name}</th><th>K</th><th>D</th></tr>${rows.filter(r => r.team === t).map(r => `<tr class="${r.me ? 'me' : ''}"><td>${r.n}</td><td>${r.k}</td><td>${r.d}</td></tr>`).join('')}</table>`;
    $('scoreboard').innerHTML = `<h3>${M.name}</h3><div class="cols">${M.teams || mode === 'mp' ? tbl(player.team) + tbl(1 - player.team) : `<table><tr><th>OPERATOR</th><th>K</th><th>D</th></tr>${rows.map(r => `<tr class="${r.me ? 'me' : ''}"><td>${r.n}</td><td>${r.k}</td><td>${r.d}</td></tr>`).join('')}</table>`}</div>`; }
}
let bannerT = 0; function banner(t, s) { $('banner').innerHTML = t + (s ? '<small>' + s + '</small>' : ''); $('banner').classList.add('show'); bannerT = 3; }

// =====================================================================
// LOBBY UI
// =====================================================================
function initLobby() {
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { sfx.ui(); document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('sel', x === b)); document.querySelectorAll('.tab').forEach(t => t.classList.toggle('sel', t.id === 'tab-' + b.dataset.tab)); });
  const selGroup = (sel, key, attr, after) => document.querySelectorAll(sel).forEach(c => { c.classList.toggle('sel', c.dataset[attr] === settings[key]); c.onclick = () => { sfx.ui(); document.querySelectorAll(sel).forEach(x => x.classList.toggle('sel', x === c)); settings[key] = c.dataset[attr]; saveSettings(); after && after(); }; c.onmouseenter = () => sfx.ui('hover'); });
  selGroup('.modecard', 'mode', 'm'); selGroup('.diffcard', 'diff', 'd'); selGroup('.wcard.primary', 'primary', 'w'); selGroup('.wcard.secondary', 'secondary', 'w');
  const bind = (id, key, fmt, apply) => { const el = $(id), lab = el.parentElement.querySelector('b'); el.value = settings[key]; if (el.type === 'checkbox') el.checked = !!settings[key]; if (lab) lab.textContent = fmt ? fmt(settings[key]) : ''; el.oninput = () => { settings[key] = el.type === 'range' ? parseFloat(el.value) : el.type === 'checkbox' ? el.checked : el.value; if (lab) lab.textContent = fmt ? fmt(settings[key]) : ''; saveSettings(); apply && apply(settings[key]); }; };
  bind('s-sens', 'sens', v => v.toFixed(1) + '×'); bind('s-fov', 'fov', v => v + '°'); bind('s-vol', 'vol', v => Math.round(v * 100) + '%', v => sfx.setVol(v)); bind('s-crouch', 'crouch'); bind('s-shadow', 'shadow', () => 'reload to apply'); bind('s-name', 'name', null, () => refreshProfile());
  bind('x-style', 'xhStyle', null, drawXhPreview); bind('x-color', 'xhColor', null, drawXhPreview); bind('x-size', 'xhSize', v => v.toFixed(1), drawXhPreview); bind('x-gap', 'xhGap', v => v.toFixed(1), drawXhPreview); bind('x-dot', 'xhDot', null, drawXhPreview); bind('x-outline', 'xhOutline', null, drawXhPreview); bind('x-dynamic', 'xhDynamic', null, drawXhPreview);
  bind('n-server', 'server'); bind('n-room', 'room'); bind('n-mode', 'netMode');
  $('wipe').onclick = () => { Object.assign(career, { xp: 0, kills: 0, hs: 0, matches: 0, bestWave: 0, bestScore: 0, wins: 0 }); saveCareer(); refreshProfile(); };
  $('deploy').onclick = () => { sfx.init(); sfx.resume(); sfx.ui(); net.disconnect(); resetGame(false); play(); };
  $('netconnect').onclick = () => { sfx.init(); sfx.resume(); sfx.ui(); net.connect(settings.server, settings.room, settings.name, settings.netMode); };
  $('netdeploy').onclick = () => { if (!net.on) return net.status('CONNECT FIRST'); sfx.ui(); resetGame(true); play(); };
  $('restart').onclick = () => { sfx.ui(); resetGame(false); play(); }; $('rematch').onclick = () => { sfx.ui(); if (mode === 'mp') { toLobby(); } else { resetGame(false); play(); } };
  $('resume').onclick = () => play(); for (const id of ['tolobby', 'tolobby2', 'tolobby3']) $(id).onclick = () => { sfx.ui('back'); net.disconnect(); toLobby(); };
  document.querySelectorAll('.card, #tabs button, button').forEach(b => b.addEventListener('mouseenter', () => sfx.ui('hover')));
  drawXhPreview(); refreshProfile();
}
function drawXhPreview() { const c = $('xhprev').getContext('2d'); c.clearRect(0, 0, 200, 120); c.fillStyle = '#2b3a2c'; c.fillRect(0, 0, 200, 120); xhSpread = 6; drawCrosshair(); c.drawImage($('xh'), 52, 12); }



// =====================================================================
// DRIVABLE TANKS — the live T-55As. Turret + barrel are cut out of the single body mesh so they can rotate.
// =====================================================================
const vehicles = [], driver = { tank: null, mdx: 0, mdy: 0, camYaw: 0, camPitch: 0.12 }, tShells = [];
const shellMat = new THREE.SpriteMaterial({ map: softTex, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false });
const TURRET_C = { y: 1.35, z: 0.0, r: 1.45 }, BARREL_C = { y: 1.5, z: 1.1 };
const splitCache = new Map();
function splitTankGeo(geo, rel) {   // returns { hull, turret, barrel } geometries in tank-local space (turret/barrel relative to their pivots)
  const key = geo.uuid; if (splitCache.has(key)) return splitCache.get(key);
  const src = geo.index ? geo.toNonIndexed() : geo, pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv, nm = new THREE.Matrix3().getNormalMatrix(rel);
  const out = { hull: [[], [], []], turret: [[], [], []], barrel: [[], [], []] }, v = [V3(), V3(), V3()], n = V3();
  for (let t = 0; t < pos.count; t += 3) {
    for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, t + k).applyMatrix4(rel);
    const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
    const part = (cz >= 1.15 && Math.abs(cx) < 0.36 && cy > 1.33) ? 'barrel' : (Math.hypot(cx, cz - TURRET_C.z) < TURRET_C.r && cy > 1.4) ? 'turret' : 'hull';
    const off = part === 'turret' ? V3(0, TURRET_C.y, TURRET_C.z) : part === 'barrel' ? V3(0, BARREL_C.y, BARREL_C.z) : V3(); const o = out[part];
    for (let k = 0; k < 3; k++) { o[0].push(v[k].x - off.x, v[k].y - off.y, v[k].z - off.z); if (nor) { n.fromBufferAttribute(nor, t + k).applyMatrix3(nm).normalize(); o[1].push(n.x, n.y, n.z); } if (uv) o[2].push(uv.getX(t + k), uv.getY(t + k)); }
  }
  const res = {}; for (const part in out) { const o = out[part]; if (!o[0].length) continue; const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(o[0], 3)); if (o[1].length) gg.setAttribute('normal', new THREE.Float32BufferAttribute(o[1], 3)); else gg.computeVertexNormals(); if (o[2].length) gg.setAttribute('uv', new THREE.Float32BufferAttribute(o[2], 2)); res[part] = gg; }
  splitCache.set(key, res); return res;
}
function makeDrivable(t) {
  t.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(t.matrixWorld).invert(), meshes = []; t.traverse(o => { if (o.isMesh && o.visible) meshes.push(o); });
  const hull = new THREE.Group(), turret = new THREE.Group(), barrel = new THREE.Group(); turret.position.set(0, TURRET_C.y, TURRET_C.z); barrel.position.set(0, BARREL_C.y - TURRET_C.y, BARREL_C.z - TURRET_C.z); turret.add(barrel);
  const v = { t, hull, turret, barrel, team: t.userData.team, pos: t.position.clone(), quat: t.quaternion.clone(), speed: 0, tYaw: 0, elev: 0, reload: 0, recoil: 0, dead: false, respawnT: 0, remoteT: 0, remoteDriver: null, driver: null };
  for (const m of meshes) { const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld), parts = splitTankGeo(m.geometry, rel);
    for (const part in parts) { const mm = new THREE.Mesh(parts[part], m.material); mm.castShadow = mm.receiveShadow = true; mm.userData.metal = true; mm.userData.vehicle = v; (part === 'hull' ? hull : part === 'turret' ? turret : barrel).add(mm); } }
  while (t.children.length) t.remove(t.children[0]); t.add(hull, turret);
  v.muzzle = new THREE.Object3D(); v.muzzle.position.set(-0.02, 1.52 - BARREL_C.y, 4.75 - BARREL_C.z); barrel.add(v.muzzle); t.userData.muzzle = v.muzzle;
  const yaw = Math.atan2(_fw.set(0, 0, 1).applyQuaternion(t.quaternion).x, _fw.z); v.home = { x: t.position.x, z: t.position.z, yaw };
  const o = obstacles.find(o => Math.abs(o.x - t.position.x) < 0.01 && Math.abs(o.z - t.position.z) < 0.01 && o.r > 4); if (o) o.h = -1e9;   // static collider replaced by the dynamic one
  vehicles.push(v); return v;
}
function resetTank(v) { v.pos.set(v.home.x, getH(v.home.x, v.home.z), v.home.z); v.quat.setFromEuler(new THREE.Euler(0, v.home.yaw, 0, 'YXZ')); v.speed = 0; v.tYaw = 0; v.elev = 0; v.dead = false; v.driver = null; v.remoteDriver = null; v.remoteT = 0; v.t.visible = true; v.t.userData.driven = false; v.t.position.copy(v.pos); v.t.quaternion.copy(v.quat); v.turret.rotation.y = 0; v.barrel.rotation.x = 0; }
function nearTank() { for (const v of vehicles) if (!v.dead && !v.driver && v.remoteT <= 0 && v.pos.distanceTo(player.pos) < 6.5) return v; return null; }
function pushVehicles(p, r) { for (const v of vehicles) { if (v.dead || v === driver.tank) continue; const dx = p.x - v.pos.x, dz = p.z - v.pos.z, d = Math.hypot(dx, dz), want = 3.4 + r; if (d < want && d > 0.001) { p.x += dx / d * (want - d); p.z += dz / d * (want - d); } } }
function enterTank(v) {
  driver.tank = v; v.driver = player; v.t.userData.driven = true; driver.mdx = driver.mdy = 0; _fw.set(0, 0, 1).applyQuaternion(v.quat); driver.camYaw = Math.atan2(_fw.x, _fw.z) + v.tYaw; driver.camPitch = 0.02;
  ads = false; mouseDown = false; player.crouch = false; for (const k in vms) vms[k].root.visible = false; $('hud').classList.add('driving'); $('tankhud').classList.remove('hidden'); engine(true, 0, 0, 'tank'); sfx.click('bolt');
}
function leaveTank(silent) {
  const v = driver.tank; if (!v) return; driver.tank = null; v.driver = null; v.t.userData.driven = false; $('hud').classList.remove('driving'); $('tankhud').classList.add('hidden'); engine(false);
  if (silent) return; _rt.set(1, 0, 0).applyQuaternion(v.quat); let x = v.pos.x + _rt.x * 4, z = v.pos.z + _rt.z * 4; player.pos.set(x, getH(x, z), z); player.vel.set(0, 0, 0); player.yaw = driver.camYaw + Math.PI; player.pitch = 0;
}
function destroyTank(v) { if (v.dead) return; v.dead = true; v.respawnT = 25; v.t.visible = false; v.t.userData.driven = true; const at = v.pos.clone().add(V3(0, 1.5, 0)); explodeFx(at, true); if (driver.tank === v) leaveTank(true); if (net.on) net.send({ t: 'boom', p: at.toArray().map(x => +x.toFixed(2)), big: 1 }); }
function useVehicle() {
  if (state !== 'play' || player.dead) return;
  if (pilot.plane) return togglePlane(); if (driver.tank) return leaveTank(false);
  const t = nearTank(), p = nearPlane(); if (t && (!p || t.pos.distanceTo(player.pos) < p.pos.distanceTo(player.pos))) enterTank(t); else if (p) togglePlane();
}
function driveTank(v, dt) {
  const fwdIn = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), turnIn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0), maxF = keys.ShiftLeft ? 12 : 9;
  const target = fwdIn > 0 ? maxF : fwdIn < 0 ? -5 : 0; v.speed += clamp(target - v.speed, -8 * dt, (target === 0 ? 8 : 5) * dt);
  _fw.set(0, 0, 1).applyQuaternion(v.quat); let yaw = Math.atan2(_fw.x, _fw.z); yaw += turnIn * (0.75 - Math.min(0.3, Math.abs(v.speed) * 0.02)) * dt * (v.speed < -0.2 ? -1 : 1);
  const hx = Math.sin(yaw), hz = Math.cos(yaw), old = v.pos.clone(); v.pos.x += hx * v.speed * dt; v.pos.z += hz * v.speed * dt; v.pos.y = old.y;
  const cp = V3(v.pos.x, v.pos.y + 1.2, v.pos.z); resolveCollision(cp, 3.3); v.pos.x = cp.x; v.pos.z = cp.z;   // low rocks / sandbags are driven over
  for (const e of entities) if (!e.dead && e.isBot && e.pos.distanceTo(v.pos) < 3.6 && Math.abs(v.speed) > 3) e.damage(999, e.pos.clone(), false, player);   // run them over
  if (v.pos.distanceTo(old) < Math.abs(v.speed) * dt * 0.3) v.speed *= 0.5;   // stopped by an obstacle
  // sit on the terrain: pitch/roll from four height samples
  const hf = getH(v.pos.x + hx * 3, v.pos.z + hz * 3), hb = getH(v.pos.x - hx * 3, v.pos.z - hz * 3), hl = getH(v.pos.x + hz * 1.7, v.pos.z - hx * 1.7), hr = getH(v.pos.x - hz * 1.7, v.pos.z + hx * 1.7);
  v.pos.y = (hf + hb + hl + hr) / 4; _qT.setFromEuler(new THREE.Euler(-Math.atan2(hf - hb, 6), yaw, Math.atan2(hl - hr, 3.4) * -1, 'YXZ')); v.quat.slerp(_qT, 1 - Math.exp(-10 * dt));
  // turret follows the camera, barrel elevates with it
  driver.camYaw -= driver.mdx * 0.0022; driver.camPitch = clamp(driver.camPitch - driver.mdy * 0.0022, -0.5, 0.45); driver.mdx = driver.mdy = 0;
  // turret + barrel aim at whatever is under the screen centre (camera ray -> terrain / object)
  camera.updateMatrixWorld(); const cdir = camera.getWorldDirection(V3()), aimHit = traceShot(camera.position, cdir, 600, null); v.aimP = aimHit.point.clone();
  const piv = v.turret.getWorldPosition(V3()), d = v.aimP.clone().sub(piv), want = Math.atan2(Math.sin(Math.atan2(d.x, d.z) - yaw), Math.cos(Math.atan2(d.x, d.z) - yaw));
  let dy = Math.atan2(Math.sin(want - v.tYaw), Math.cos(want - v.tYaw)); v.tYaw += clamp(dy, -1.1 * dt, 1.1 * dt);
  const hullPitch = Math.asin(clamp(_fw.set(0, 0, 1).applyQuaternion(v.quat).y, -1, 1)) * Math.cos(v.tYaw);
  v.elev = lerp(v.elev, clamp(Math.atan2(d.y - 0.15, Math.hypot(d.x, d.z)) - hullPitch, -0.12, 0.35), 1 - Math.exp(-5 * dt)); v.turret.rotation.y = v.tYaw; v.barrel.rotation.x = -v.elev;
  v.recoil = lerp(v.recoil, 0, 1 - Math.exp(-5 * dt)); v.barrel.position.z = BARREL_C.z - TURRET_C.z - v.recoil;
  v.t.position.copy(v.pos); v.t.quaternion.copy(v.quat);
  // cannon
  v.reload -= dt;
  if (mouseDown && v.reload <= 0) {
    v.reload = 3.2; v.recoil = 0.45; v.t.updateMatrixWorld(true); const m = v.muzzle.getWorldPosition(V3()), dir = _fw.set(0, 0, 1).applyQuaternion(v.barrel.getWorldQuaternion(_q1)).normalize().clone();
    const s = new THREE.Sprite(shellMat); s.scale.setScalar(0.6); s.position.copy(m); scene.add(s); tShells.push({ s, pos: m.clone(), vel: dir.multiplyScalar(170), life: 4 });
    burst(m, 40, 14, [1, 0.7, 0.3], 1.2, 0.3, 0); puffSmoke(m, 14, 2, 8, 0.4, [2, 4], 1.5, 1, 0.5); const l = expLights[0]; l.position.copy(m); l.intensity = 900; sfx.tankShot(0, 0); fx.shake = Math.max(fx.shake, 0.55);
    if (net.on) net.send({ t: 'shot', o: m.toArray().map(x => +x.toFixed(2)), p: m.toArray().map(x => +x.toFixed(2)), w: 'tank' });
  }
  player.pos.copy(v.pos).add(_b.set(0, 1.2, 0)); player.vel.set(0, 0, 0); player.onGround = true; player.sprinting = false;
  engine(true, Math.min(1, Math.abs(v.speed) / 9 * 0.8 + (fwdIn ? 0.2 : 0)), v.speed, 'tank');
  $('th-spd').textContent = Math.round(Math.abs(v.speed) * 3.6); $('th-rel').style.width = Math.round(clamp(1 - v.reload / 3.2, 0, 1) * 100) + '%'; $('th-state').textContent = v.reload > 0 ? 'LOADING' : 'READY';
  v.t.updateMatrixWorld(true); _a.copy(v.muzzle.getWorldPosition(V3())).addScaledVector(_fw.set(0, 0, 1).applyQuaternion(v.barrel.getWorldQuaternion(_q1)), 180).project(camera); const r = $('th-reticle'); r.style.left = ((_a.x + 1) / 2 * innerWidth) + 'px'; r.style.top = ((1 - _a.y) / 2 * innerHeight) + 'px';
}
function tankCam(v, dt) {
  const zoom = ads, cp = Math.cos(driver.camPitch), A = _b.set(Math.sin(driver.camYaw) * cp, Math.sin(driver.camPitch), Math.cos(driver.camYaw) * cp), tp = V3().copy(v.pos).add(V3(0, 2.6, 0));
  _cp.copy(tp).addScaledVector(A, zoom ? -3.2 : -11).add(_a.set(0, zoom ? 0.8 : 2.6, 0)); _cp.y = Math.max(_cp.y, getH(_cp.x, _cp.z) + 1.2);
  camera.position.lerp(_cp, 1 - Math.exp(-12 * dt)); camera.up.copy(AY); camera.lookAt(_a.copy(tp).addScaledVector(A, 60));
  camera.fov = lerp(camera.fov, zoom ? 32 : 70, 1 - Math.exp(-8 * dt)); camera.updateProjectionMatrix(); if (fx.shake > 0.01) camera.rotateZ((Math.random() - 0.5) * fx.shake * 0.04);
}
function updateVehicles(dt) {
  for (const v of vehicles) {
    if (v.dead) { v.respawnT -= dt; if (v.respawnT <= 0) resetTank(v); continue; }
    if (v.remoteT > 0) { v.remoteT -= dt; if (v.remoteT <= 0) { v.remoteDriver = null; v.t.userData.driven = false; } }
  }
  for (const sh of tShells.slice()) {
    sh.life -= dt; const prev = sh.pos.clone(); sh.vel.y -= 9.8 * dt; sh.pos.addScaledVector(sh.vel, dt); const seg = sh.pos.clone().sub(prev), len = seg.length();
    const hit = traceShot(prev, seg.normalize(), len, null), done = hit.dist < len - 1e-3 || sh.life <= 0;
    if (!done) { sh.s.position.copy(sh.pos); smokeTrail(sh.pos); continue; }
    scene.remove(sh.s); tShells.splice(tShells.indexOf(sh), 1); const at = hit.dist < len ? hit.point : sh.pos;
    if (hit.entity) { hit.entity.damage(hit.part === 'armor' ? 95 : 260, at, false, player); hitmark(hit.entity.dead, false); }
    world.explode(at.clone(), false, player); if (net.on) net.send({ t: 'boom', p: at.toArray().map(x => +x.toFixed(2)), big: 0 });
  }
}
function tankNet(v) { const r = x => +x.toFixed(3); return [r(v.pos.x), r(v.pos.y), r(v.pos.z), r(v.quat.x), r(v.quat.y), r(v.quat.z), r(v.quat.w), r(v.tYaw), r(v.elev)]; }
function smokeTrail(p) { if (Math.random() < 0.6) puffSmoke(p, 1, 0.4, 1.4, 0.55, [0.4, 0.8], 0.2, 0.2, 0.35); }

// =====================================================================
// FLYABLE JETS — team bases in multiplayer and in the solo team modes
// =====================================================================
const planes = [], pilot = { plane: null, mdx: 0, mdy: 0, chute: false, aimYaw: 0, aimPitch: 0, aim: new THREE.Vector3(0, 0, 1) };
const _m4 = new THREE.Matrix4(), _qT = new THREE.Quaternion(), ORIGIN = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _fw = new THREE.Vector3(), _up = new THREE.Vector3(), _rt = new THREE.Vector3(), AX = V3(1, 0, 0), AY = V3(0, 1, 0), AZ = V3(0, 0, 1);
const bombGeoP = new THREE.CylinderGeometry(0.22, 0.16, 1.2, 8).rotateX(Math.PI / 2), bombMatP = new THREE.MeshStandardMaterial({ color: 0x3a3d36, roughness: 0.6, metalness: 0.5 }), pBombs = [];
function playerAim() { return pilot.plane ? pilot.plane.pos : driver.tank ? _c.copy(driver.tank.pos).add(V3(0, 2, 0)) : camera.position; }
function planeNet(p) { const r = v => +v.toFixed(2); return [r(p.pos.x), r(p.pos.y), r(p.pos.z), +p.quat.x.toFixed(4), +p.quat.y.toFixed(4), +p.quat.z.toFixed(4), +p.quat.w.toFixed(4), p.cfg.kind]; }
// procedural B-2 Spirit: flying-wing planform with the sawtooth trailing edge, blended centre body, engine humps
function buildB2() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.55, metalness: 0.3 }), dark = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.4, metalness: 0.5 });
  const pts = [[0, 10], [17, -4], [17, -5], [11.5, -1.6], [7, -6], [2.8, -3.1], [0, -5.3], [-2.8, -3.1], [-7, -6], [-11.5, -1.6], [-17, -5], [-17, -4]];
  const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.5, bevelSegments: 3 }), m);
  wing.rotation.x = Math.PI / 2; wing.position.y = 0.3; g.add(wing);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), m); body.scale.set(4.2, 1.25, 9.5); body.position.set(0, 0.35, 1.6); g.add(body);
  for (const s of [-1, 1]) { const hump = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), m); hump.scale.set(2.1, 0.75, 5); hump.position.set(s * 4.6, 0.45, -0.6); g.add(hump); const ex = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.6), dark); ex.position.set(s * 4.6, 0.55, -4.1); g.add(ex); const intake = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.5), dark); intake.position.set(s * 4.2, 0.95, 2.2); intake.rotation.x = -0.3; g.add(intake); }
  const cock = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), dark); cock.scale.set(1.6, 0.45, 1.6); cock.position.set(0, 1.35, 6.2); g.add(cock);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xff8030, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); glow.scale.set(3, 1.2, 1); glow.position.set(0, 0.5, -4.6); g.add(glow);
  const ex = new THREE.Object3D(); ex.position.z = -4.6; g.add(ex); g.userData.exhaust = ex; g.scale.setScalar(0.8); return g;
}
const PLANE_KINDS = [
  { kind: 0, name: 'JET', build: () => buildJet(1.0), maxSpd: 92, boost: 1.4, turn: 1.8, bank: 1.15, gun: true, bombCd: 3.5, hp: 220, lift: 28, stall: 24, landSpd: 48, colR: 2.5, cam: [16, 4.5], gear: 1.0 },
  { kind: 1, name: 'B-2 SPIRIT', build: buildB2, maxSpd: 72, boost: 1.2, turn: 0.95, bank: 0.7, gun: false, stick: 12, stickDt: 0.14, bombCd: 9, hp: 600, lift: 26, stall: 20, landSpd: 44, colR: 9, cam: [34, 10], gear: 1.5 },
];
function setupPlanes() {
  for (const p of planes) scene.remove(p.g); planes.length = 0; pilot.plane = null;
  if (!(mode === 'mp' || M.teams)) return;
  for (let team = 0; team < 2; team++) for (const [kind, lat, d] of [[0, -12, 18], [0, 12, 18], [1, 0, 4]]) {   // two jets + one B-2 per base, parked on the runway
    const cfg = PLANE_KINDS[kind], b = BASES[team], L = Math.hypot(b.x, b.z), dx = -b.x / L, dz = -b.z / L, x = b.x + dx * d - dz * lat, z = b.z + dz * d + dx * lat, yaw = Math.atan2(dx, dz);
    const p = { team, cfg, home: { x, z, yaw }, g: cfg.build(), pos: V3(), quat: new THREE.Quaternion(), speed: 0, throttle: 0, onGround: true, pilot: null, dead: false, respawnT: 0, remoteT: 0, gunCd: 0, bombCd: 0, stickLeft: 0, stickT: 0, hp: cfg.hp };
    p.g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } else if (o.isSprite) o.raycast = () => {}; });
    scene.add(p.g); resetPlane(p); planes.push(p);
  }
}
function resetPlane(p) { p.pos.set(p.home.x, getH(p.home.x, p.home.z) + p.cfg.gear, p.home.z); p.stickLeft = 0; p.quat.setFromEuler(new THREE.Euler(0, p.home.yaw, 0, 'YXZ')); p.speed = 0; p.throttle = 0; p.onGround = true; p.dead = false; p.pilot = null; p.hp = p.cfg.hp; p.g.visible = true; p.g.position.copy(p.pos); p.g.quaternion.copy(p.quat); }
function nearPlane() { for (const p of planes) if (!p.dead && !p.pilot && p.remoteT <= 0 && p.pos.distanceTo(player.pos) < (p.cfg.kind ? 13 : 8)) return p; return null; }
function togglePlane() {
  if (state !== 'play' || player.dead) return;
  if (pilot.plane) { const p = pilot.plane; if (p.onGround && p.speed < 15) leavePlane(false); else { leavePlane(false); pilot.chute = true; banner('EJECTED'); } return; }
  const p = nearPlane(); if (!p) return;
  pilot.plane = p; p.pilot = player; pilot.mdx = pilot.mdy = 0; _fw.set(0, 0, 1).applyQuaternion(p.quat); pilot.aimYaw = Math.atan2(_fw.x, _fw.z); pilot.aimPitch = 0; pilot.aim.copy(_fw); ads = false; mouseDown = false; player.crouch = false; for (const k in vms) vms[k].root.visible = false;
  $('hud').classList.add('flying'); $('flighthud').classList.remove('hidden'); engine(true); sfx.click('bolt');
}
function leavePlane(silent) {
  const p = pilot.plane; if (!p) return; pilot.plane = null; p.pilot = null; $('hud').classList.remove('flying'); $('flighthud').classList.add('hidden'); engine(false);
  if (silent) return;
  _rt.set(-1, 0, 0).applyQuaternion(p.quat); player.pos.set(p.pos.x + _rt.x * 4, p.pos.y, p.pos.z + _rt.z * 4); player.vel.set(0, 0, 0); player.yaw = Math.atan2(-_fw.set(0, 0, 1).applyQuaternion(p.quat).x, -_fw.z) + Math.PI; player.pitch = 0;
  if (p.onGround) { player.pos.y = getH(player.pos.x, player.pos.z); p.respawnT = 0; } else p.respawnT = 0.01;
}
function destroyPlane(p, crash) {
  if (p.dead) return; p.dead = true; p.g.visible = false; p.respawnT = 20; p.speed = 0;
  const at = p.pos.clone(); explodeFx(at, true); if (pilot.plane === p) { leavePlane(true); }
  if (crash && net.on) net.send({ t: 'boom', p: at.toArray().map(v => +v.toFixed(2)), big: 1 });
}
function flyPlane(p, dt) {
  _fw.set(0, 0, 1).applyQuaternion(p.quat); _up.set(0, 1, 0).applyQuaternion(p.quat); _rt.set(-1, 0, 0).applyQuaternion(p.quat);
  if (keys.KeyW) p.throttle = Math.min(1, p.throttle + dt * 0.9); if (keys.KeyS) p.throttle = Math.max(0, p.throttle - dt * 0.9);
  const C = p.cfg, boost = keys.ShiftLeft && p.throttle > 0.6 ? C.boost : 1, target = p.throttle * C.maxSpd * boost;
  p.speed += (target - p.speed) * (1 - Math.exp(-(target > p.speed ? (p.onGround ? 0.6 : 0.45) : 0.25) * dt)); if (!p.onGround) p.speed -= _fw.y * 9.8 * dt * 0.45; p.speed = clamp(p.speed, 0, 150);
  const ctrl = clamp(p.speed / 45, 0.15, 1), agl = p.pos.y - getH(p.pos.x, p.pos.z);
  // mouse-aim flight: the mouse moves an aim point, the jet banks and pulls toward it on its own
  pilot.aimYaw -= pilot.mdx * 0.0022; pilot.aimPitch = clamp(pilot.aimPitch - pilot.mdy * 0.0022, -1.0, 1.15); pilot.mdx = pilot.mdy = 0;
  pilot.aimYaw += ((keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0)) * 0.9 * dt;
  const vz = _fw.y * p.speed, terrainAhead = getH(p.pos.x + _fw.x * p.speed * 2, p.pos.z + _fw.z * p.speed * 2), pullUp = !p.onGround && ((vz < 0 && agl + vz * 0.65 < 7) || p.pos.y - terrainAhead < 4.5);
  if (pullUp) pilot.aimPitch = Math.max(pilot.aimPitch, 0.3);   // last-moment ground-proximity pull-up (lets you fly nap-of-the-earth, saves you from flying into the dirt)
  const lim = MAP - 25; if (Math.abs(p.pos.x) > lim || Math.abs(p.pos.z) > lim) { pilot.aimYaw = lerpAngle(pilot.aimYaw, Math.atan2(-p.pos.x, -p.pos.z), 1 - Math.exp(-1.5 * dt)); p.pos.x = clamp(p.pos.x, -MAP + 6, MAP - 6); p.pos.z = clamp(p.pos.z, -MAP + 6, MAP - 6); }
  if (p.pos.y > 280) pilot.aimPitch = Math.min(pilot.aimPitch, -0.15);
  const stall = !p.onGround && p.speed < C.stall; if (stall) pilot.aimPitch = Math.min(pilot.aimPitch, -0.08);   // stall assist: nose down to regain speed
  const cpi = Math.cos(pilot.aimPitch); pilot.aim.set(Math.sin(pilot.aimYaw) * cpi, Math.sin(pilot.aimPitch), Math.cos(pilot.aimYaw) * cpi);
  const loc = _b.copy(pilot.aim).applyQuaternion(_q1.copy(p.quat).invert()), side = Math.atan2(loc.x, loc.z);   // + = aim point to the left
  _m4.lookAt(pilot.aim, ORIGIN, AY); _qT.setFromRotationMatrix(_m4); if (!p.onGround) _qT.multiply(_q1.setFromAxisAngle(AZ, -clamp(side * 1.6, -C.bank, C.bank)));   // nose on target, wings banked into the turn
  p.quat.rotateTowards(_qT, (p.onGround ? 1.0 : pullUp ? Math.max(2.2, C.turn * 1.6) : C.turn) * ctrl * dt);
  p.quat.normalize(); _fw.set(0, 0, 1).applyQuaternion(p.quat); _up.set(0, 1, 0).applyQuaternion(p.quat);
  p.pos.addScaledVector(_fw, p.speed * dt); if (stall) p.pos.y -= (C.stall - p.speed) * 0.25 * dt;
  // ground: taxi / take-off / landing, or crash
  const gh = getH(p.pos.x, p.pos.z) + C.gear;
  if (p.pos.y <= gh) {
    const pitch = Math.asin(clamp(_fw.y, -1, 1)), yaw = Math.atan2(_fw.x, _fw.z);
    if (p.speed < C.landSpd && pitch > -0.3 && _up.y > 0.75) { p.onGround = true; p.pos.y = gh; p.quat.setFromEuler(new THREE.Euler(-(p.speed > C.lift ? Math.max(0, pitch) : 0), yaw, 0, 'YXZ')); p.speed *= Math.exp(-(p.throttle < 0.05 ? 0.5 : 0.05) * dt); }
    else { p.why = 'ground spd=' + p.speed.toFixed(1) + ' pitch=' + pitch.toFixed(2) + ' up=' + _up.y.toFixed(2); banner('CRASHED'); const pl = p; leavePlane(true); destroyPlane(pl, true); player.damage(999, null, null); return; }
  } else if (p.pos.y > gh + 0.6) p.onGround = false;
  if (!p.onGround && p.pos.y < gh + 14) for (const o of obsBox(p.pos.x - 6, p.pos.z - 6, p.pos.x + 6, p.pos.z + 6)) if ((o.tree || o.h > 2.5) && p.pos.y < o.y + o.h + 1 && Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < o.r + C.colR) { p.why = 'obs h=' + o.h.toFixed(1) + ' r=' + o.r.toFixed(1) + ' tree=' + !!o.tree + ' at ' + o.x.toFixed(0) + ',' + o.z.toFixed(0); banner('CRASHED'); const pl = p; leavePlane(true); destroyPlane(pl, true); player.damage(999, null, null); return; }
  // weapons
  p.gunCd -= dt; p.bombCd -= dt;
  if (C.gun && mouseDown && p.gunCd <= 0) { p.gunCd = 0.075; const o = p.pos.clone().addScaledVector(_fw, 6.5).addScaledVector(_up, -0.2), dir = _fw.clone(); dir.x += rand(-0.008, 0.008); dir.y += rand(-0.008, 0.008); dir.z += rand(-0.008, 0.008); dir.normalize();
    const hit = traceShot(o, dir, 450, null); tracer(o, hit.point); if (hit.entity) { hit.entity.damage(38, hit.point, false, player); hitmark(hit.entity.dead, false); } else impactFx(hit); sfx.shot('ar', 4, 0); fx.shake = Math.max(fx.shake, 0.08); if (net.on) net.send({ t: 'shot', o: o.toArray().map(v => +v.toFixed(2)), p: hit.point.toArray().map(v => +v.toFixed(2)), w: 'ar' }); }
  const dropBomb = () => { const m = new THREE.Mesh(bombGeoP, bombMatP); m.position.copy(p.pos).addScaledVector(_up, -1.4).addScaledVector(_rt, rand(-1, 1) * (C.kind ? 2.5 : 0)); m.quaternion.copy(p.quat); scene.add(m); pBombs.push({ m, v: _fw.clone().multiplyScalar(p.speed * 0.95) }); };
  if (C.stick) {   // B-2: LMB or RMB releases a carpet-bombing stick
    if ((mouseDown || ads) && p.bombCd <= 0 && !p.onGround) { p.bombCd = C.bombCd; p.stickLeft = C.stick; p.stickT = 0; sfx.whistle(3); }
    if (p.stickLeft > 0) { p.stickT -= dt; if (p.stickT <= 0) { p.stickT = C.stickDt; p.stickLeft--; dropBomb(); } }
  } else if (ads && p.bombCd <= 0 && !p.onGround) { p.bombCd = C.bombCd; dropBomb(); sfx.whistle(2.2); }
  // player rides along
  player.pos.copy(p.pos); player.vel.set(0, 0, 0); player.onGround = false; player.sprinting = false;
  p.g.position.copy(p.pos); p.g.quaternion.copy(p.quat);
  engine(true, p.throttle * boost, p.speed, C.kind ? 'b2' : 'jet');
  $('fh-spd').textContent = Math.round(p.speed * 3.6); $('fh-alt').textContent = Math.max(0, Math.round(p.pos.y - getH(p.pos.x, p.pos.z) + 1)); $('fh-thr').style.height = Math.round(p.throttle * 100) + '%'; $('fh-bomb').textContent = C.stick ? (p.stickLeft > 0 ? 'BOMBS AWAY ' + p.stickLeft : p.bombCd > 0 ? 'BAY RELOADING ' + p.bombCd.toFixed(1) + 's' : 'CARPET BOMB READY · CLICK') : p.bombCd > 0 ? 'BOMB ' + p.bombCd.toFixed(1) + 's' : 'BOMB READY'; $('fh-kind').textContent = C.name;
  $('fh-stall').classList.toggle('hidden', !stall && !pullUp); $('fh-stall').textContent = pullUp ? 'PULL UP' : 'STALL'; $('fh-ab').classList.toggle('hidden', boost === 1);
  _a.copy(p.pos).addScaledVector(_fw, 220).project(camera); const rt = $('fh-reticle'); rt.style.left = ((_a.x + 1) / 2 * innerWidth) + 'px'; rt.style.top = ((1 - _a.y) / 2 * innerHeight) + 'px'; rt.style.opacity = _a.z < 1 ? 1 : 0;
}
const _cp = new THREE.Vector3();
function chaseCam(p, dt) {   // camera follows the aim direction (not the jet's roll), so the horizon stays level
  const A = pilot.aim; _cp.copy(p.pos).addScaledVector(A, -p.cfg.cam[0]).add(_b.set(0, p.cfg.cam[1], 0)); _cp.y = Math.max(_cp.y, getH(_cp.x, _cp.z) + 1.5);
  camera.position.lerp(_cp, 1 - Math.exp(-10 * dt)); camera.up.copy(AY); camera.lookAt(_a.copy(p.pos).addScaledVector(A, 40 + p.cfg.cam[0]).add(_b.set(0, 2, 0)));
  camera.fov = lerp(camera.fov, 70 + clamp(p.speed / 150, 0, 1) * 16, 1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix();
  if (fx.shake > 0.01) camera.rotateZ((Math.random() - 0.5) * fx.shake * 0.04);
  _a.copy(p.pos).addScaledVector(A, 300).project(camera); const am = $('fh-aim'); am.style.left = ((_a.x + 1) / 2 * innerWidth) + 'px'; am.style.top = ((1 - _a.y) / 2 * innerHeight) + 'px';
}
function updatePlanes(dt) {
  camera.up.lerp(AY, pilot.plane || driver.tank ? 0 : 1); scene.fog.density = lerp(scene.fog.density, pilot.plane ? 0.0026 : 0.0042, 1 - Math.exp(-1.5 * dt));   // thinner haze at altitude
  for (const p of planes) {
    if (p.remoteT > 0) { p.remoteT -= dt; p.g.visible = false; if (p.remoteT <= 0) resetPlane(p); continue; }
    if (p.dead) { p.respawnT -= dt; if (p.respawnT <= 0) resetPlane(p); continue; }
    if (!p.pilot && !p.onGround) { // abandoned in the air: glides down and crashes
      _fw.set(0, 0, 1).applyQuaternion(p.quat); p.quat.multiply(_q1.setFromAxisAngle(AX, 0.25 * dt)).normalize(); p.speed = Math.max(40, p.speed - 3 * dt); p.pos.addScaledVector(_fw, p.speed * dt); p.pos.y -= 6 * dt; p.g.position.copy(p.pos); p.g.quaternion.copy(p.quat);
      if (p.pos.y <= getH(p.pos.x, p.pos.z) + p.cfg.gear) { world.explode(p.pos.clone(), true, null); destroyPlane(p, true); }
    } else if (!p.pilot && p.onGround && p.respawnT > 0) { p.respawnT -= dt; }
  }
  for (const b of pBombs.slice()) { b.v.y -= 20 * dt; b.m.position.addScaledVector(b.v, dt); b.m.lookAt(_a.copy(b.m.position).add(b.v)); const gh = getH(b.m.position.x, b.m.position.z); if (b.m.position.y <= gh) { b.m.position.y = gh; const at = b.m.position.clone(); world.explode(at, true, player); if (net.on) net.send({ t: 'boom', p: at.toArray().map(v => +v.toFixed(2)), big: 1 }); scene.remove(b.m); pBombs.splice(pBombs.indexOf(b), 1); } }
  if (pilot.chute && !pilot.plane) { if (player.vel.y < -7) player.vel.y = -7; if (player.onGround) pilot.chute = false; }
}
// jet engine: looping filtered noise + whine, follows throttle
let eng = null;
function engine(on, thr = 0, spd = 0, kind = 'jet') {
  const c = sfx.ctx; if (!c) return;
  if (!eng && on) { const s = c.createBufferSource(); s.buffer = sfx.brown; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); g.gain.value = 0; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180; const og = c.createGain(); og.gain.value = 0; const of = c.createBiquadFilter(); of.type = 'bandpass'; of.frequency.value = 1800; of.Q.value = 2; s.connect(f); f.connect(g); g.connect(sfx.master); o.connect(of); of.connect(og); og.connect(sfx.master); s.start(); o.start(); eng = { s, f, g, o, og }; }
  if (!eng) return; const t = c.currentTime;
  if (!on) { eng.g.gain.setTargetAtTime(0, t, 0.2); eng.og.gain.setTargetAtTime(0, t, 0.2); const e = eng; eng = null; setTimeout(() => { try { e.s.stop(); e.o.stop(); } catch (x) {} }, 1200); return; }
  if (kind === 'tank') { eng.o.type = 'square'; eng.g.gain.setTargetAtTime(0.35 + thr * 0.45, t, 0.15); eng.f.frequency.setTargetAtTime(140 + thr * 420, t, 0.15); eng.o.frequency.setTargetAtTime(32 + Math.abs(spd) * 3 + thr * 18, t, 0.2); eng.og.gain.setTargetAtTime(0.03 + thr * 0.04, t, 0.2); return; }
  eng.o.type = 'sawtooth'; const k2 = kind === 'b2' ? 0.6 : 1;
  eng.g.gain.setTargetAtTime(0.25 + thr * 0.55, t, 0.15); eng.f.frequency.setTargetAtTime((250 + thr * 1400) * k2, t, 0.15); eng.o.frequency.setTargetAtTime((160 + spd * 6 + thr * 300) * k2, t, 0.2); eng.og.gain.setTargetAtTime(0.015 + thr * 0.04, t, 0.2);
}

// =====================================================================
// LOOP
// =====================================================================
const clock = new THREE.Clock(); let simT = 0;
function loop() { requestAnimationFrame(loop); tick(Math.min(clock.getDelta(), 0.05)); }
function tick(dt) {
  simT += dt; const t = simT; now = t; world.frame++;
  if (state === 'play' || state === 'dead') {
    if (state === 'play') { if (pilot.plane) flyPlane(pilot.plane, dt); else if (driver.tank) driveTank(driver.tank, dt); else updatePlayer(dt); }
    updatePlanes(dt); updateVehicles(dt);
    for (const e of entities.slice()) if (e.isBot) e.update(dt);
    net.update(dt);
    if (state === 'play' && !player.dead && !pilot.plane && !driver.tank) updateWeapon(dt); else if (pilot.plane || driver.tank) for (const k in vms) vms[k].root.visible = false;
    if (!matchOver && state === 'play') {
      if (mode === 'survival') { const alive = entities.filter(e => !e.dead && e.team !== player.team).length; if (alive === 0 && !player.dead) { if (waveT <= 0) { waveT = 6; banner('AREA CLEAR', 'NEXT WAVE IN 6 SECONDS'); addScore(500, 'WAVE CLEARED'); } else { waveT -= dt; if (waveT <= 0) { wave++; spawnBots(); } } } }
      else if (mode !== 'mp') { updateObjectives(dt); matchT += dt; if (teamScore[0] >= M.target || teamScore[1] >= M.target) endMatch(teamScore[0] >= M.target ? 0 : 1); }
    }
    updateHUDText();
    if (hmT > 0) { hmT -= dt; if (hmT <= 0) $('hitmarker').className = ''; }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
    fx.shake *= Math.exp(-5 * dt);
    if (pilot.plane) chaseCam(pilot.plane, dt); else if (driver.tank) tankCam(driver.tank, dt); else camera.rotation.set(player.pitch + recoilPitch + (Math.random() - 0.5) * fx.shake * 0.08, player.yaw + (Math.random() - 0.5) * fx.shake * 0.06, (Math.random() - 0.5) * fx.shake * 0.04);
    if (world.frame % 2 === 0) drawHUD();
  } else if (state === 'menu') { const a = t * 0.06; camera.position.set(Math.cos(a) * 40, getH(Math.cos(a) * 40, Math.sin(a) * 40) + 6, Math.sin(a) * 40); camera.lookAt(0, getH(0, 0) + 8 + Math.sin(t * 0.3) * 3, 0); for (const k in vms) vms[k].root.visible = false; }
  updateWorld(dt, t);
  renderScope();
  renderer.render(scene, camera);
}
world.explode = (p, big, attacker = null) => { explodeFx(p, big); const R = big ? 13 : 8, d = p.distanceTo(player.pos); if (d < R) player.damage((pilot.plane ? 140 : 90) * (1 - d / R), p, attacker === player ? null : attacker); for (const e of entities) { if (e.dead || !e.isBot) continue; const bd = e.pos.distanceTo(p); if (bd < R) e.damage(150 * (1 - bd / R), e.pos, false, attacker); } for (const pl of planes) if (!pl.pilot && !pl.dead && pl.pos.distanceTo(p) < R * 0.7) destroyPlane(pl, false); };
world.active = () => state !== 'menu'; world.playerPos = () => player.pos;

// =====================================================================
// ASSET LOADING → START
// =====================================================================
async function loadAssets() {
  const note = $('assetnote'), bar = $('loadfill'), files = [['forest', 'forest.glb'], ['tank', 'tank_t-55a.glb'], ['soldier', 'soldier_character.glb'], ['ak', 'fps_ak_animated.glb'], ['pistol', 'animated_pistol.glb'], ['sniper', 'sniper_animated.glb'], ['ar', 'ar-15.glb'], ['glock', 'glock_gun_3d_model_free_download.glb']];
  const prog = {}, upd = () => { let s = 0; for (const f of files) s += prog[f[0]] || 0; bar.style.width = (s / files.length * 100) + '%'; };
  const failed = [];
  await Promise.all(files.map(async ([key, url]) => { try { const g = await loadModel(url, e => { if (e.total) { prog[key] = e.loaded / e.total; upd(); } }); prog[key] = 1; upd(); setupTextures(g.scene); assets[key] = g; } catch (e) { console.warn('asset failed', url, e); failed.push(key); } }));
  if (assets.forest) { try { const p = forestPatch(partsFromScene(assets.forest.scene)); if (p.trunks.length) assets.forestPatch = p; } catch (e) { console.warn('forest split failed', e); } }
  if (assets.soldier) { try { soldierParts = buildSoldierParts(assets.soldier); } catch (e) { console.warn('soldier split failed', e); soldierParts = null; } }
  if (assets.ak) { let base = null; assets.ak.scene.traverse(o => { if (!base && o.isMesh && o.name.startsWith('base_ak74')) base = o; }); if (base) { botGun = new THREE.Group(); const m = new THREE.Mesh(base.geometry, base.material); m.scale.setScalar(0.0085); botGun.add(m); const mz = new THREE.Object3D(); mz.name = 'muzzle'; mz.position.set(0, 14.3 * 0.0085, 76 * 0.0085); botGun.add(mz); } }
  seedWorld(4242); buildStructures(assets.tank); const forestMode = buildForest(assets.forestPatch || null);
  if (assets.tank) for (const t of tanks) if (!t.userData.wrecked && !t.userData.proc) { try { makeDrivable(t); } catch (e) { console.warn('tank split failed', e); } }
  unseedWorld();
  for (const key in WEAPONS) { const w = WEAPONS[key]; let g = assets[key], swap = null; if (w.donor) { const d = assets[w.donor]; if (!d || !g) continue; swap = Object.assign({ gltf: g }, w.swap); w.rig = WEAPONS[w.donor].rig; g = { scene: SkeletonUtils.clone(d.scene), animations: d.animations }; } if (!g || !w.rig) continue; try { const vm = new RigVM(w, g, swap); vms[key] = vm; vm.root.visible = false; weaponRoot.add(vm.root); } catch (e) { console.warn('viewmodel failed', key, e); } }
  for (const key in WEAPONS) if (!vms[key]) { const w = WEAPONS[key], g = new THREE.Group(); g.add(box(0.06, 0.07, 0.5, vmMats.metal, 0, 0, -0.1, false)); const mz = new THREE.Object3D(); mz.position.set(0, 0.01, -0.4); g.add(mz); vms[key] = { root: g, muzzle: mz, hip: V3(0.2, -0.2, -0.4), ads: V3(0, -0.08, -0.3), len: { fire: 0.1, reload: w.reload, draw: 0.4 }, play() {}, update() {} }; g.visible = false; weaponRoot.add(g); }
  note.className = failed.length ? 'warn' : ''; note.innerHTML = failed.length ? `Some models failed (${failed.join(', ')}). Open the game through <b>start.bat</b> (local server) — browsers block .glb over file://.` : `assets loaded · forest: ${forestMode} · soldiers: ${soldierParts ? 'model' : 'procedural'} · tanks: ${assets.tank ? 'T-55A' : 'procedural'}`;
  $('deploy').disabled = false; $('netdeploy').disabled = false; $('loadwrap').classList.add('done');
}
initLobby(); loop(); loadAssets();
window.FPS = { vehicles, driver, useVehicle, planes, pilot, togglePlane, scene, camera, renderer, player, entities, settings, career, vms, weaponRoot, assets, net, WEAPONS, get state() { return state; }, get ammo() { return ammo; }, get wave() { return wave; }, get mode() { return mode; }, get teamScore() { return teamScore; }, flags, DOM_POINTS, step: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt); }, press: (b, v) => { if (b === 0) mouseDown = v; else ads = v; }, traceShot, cur, Bot, spawnBots, endMatch, resetGame, play };
