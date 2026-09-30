// Studio renderer for exercise clips: IK mannequin, equipment, overlay compositor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const OUT = { w: 1280, h: 800, ss: 1.4, fps: 30 };
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0), Zv = V(0, 0, 1);

// ---------- body dimensions (metres) ----------
export const D = {
  spineLo: 0.24, spineHi: 0.25, shoDrop: 0.035, shoW: 0.185, hipW: 0.095, hipDrop: 0.035,
  neck: 0.08, upper: 0.29, fore: 0.26, thigh: 0.43, shin: 0.42, ankleH: 0.075,
};
export const ARM = D.upper + D.fore;

// ---------- palette ----------
export const PAL = {
  skin: '#a4acbf', joint: '#838ca3', tint: '#4a51dc',
  steel: '#8d929e', graphite: '#2a2c36', rubber: '#22242c', wood: '#c69a64', woodDark: '#9c7244',
  band: '#4a51dc', pad: '#1d1f27', ink: '#16161d', accent: '#3a41cc',
};

// ---------- small math ----------
const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - t, 3);
const vec = a => V(a[0], a[1], a[2]);
const mir = (a, s) => a && [a[0], a[1], a[2] * s];
function orth(v, axis) { const o = v.clone().addScaledVector(axis, -v.dot(axis)); return o; }

export const warnings = [];
function ik(A, T, l1, l2, pole, tag) {
  const d = T.clone().sub(A); const L = d.length(); const dir = d.clone().normalize();
  if (L > l1 + l2 + 0.01) warnings.push(`${tag} over-reach ${(L - l1 - l2).toFixed(3)}`);
  const Lc = Math.min(Math.max(L, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4);
  const a = (l1 * l1 - l2 * l2 + Lc * Lc) / (2 * Lc); const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let pd = orth(pole.clone(), dir); if (pd.lengthSq() < 1e-8) pd = orth(V(0, 0, 1), dir); pd.normalize();
  const mid = A.clone().addScaledVector(dir, a).addScaledVector(pd, h);
  const end = A.clone().addScaledVector(dir, Lc);
  return [mid, end];
}

// Shoulder centre given pelvis & torso params, and the inverse.
function torsoFrame(p) {
  const a1 = p.pitch || 0, a2 = a1 + (p.curl || 0);
  const u1 = V(Math.sin(a1), Math.cos(a1), 0), u2 = V(Math.sin(a2), Math.cos(a2), 0);
  const f1 = V(Math.cos(a1), -Math.sin(a1), 0), f2 = V(Math.cos(a2), -Math.sin(a2), 0);
  return { a1, a2, u1, u2, f1, f2 };
}
// offset from pelvis centre to shoulder-line centre
export function shoOffset(p) {
  const { u1, u2, f2 } = torsoFrame(p);
  return u1.clone().multiplyScalar(D.spineLo).addScaledVector(u2, D.spineHi + (-D.shoDrop + (p.shrug || 0))).addScaledVector(f2, p.protract || 0);
}
export function pelvisFor(p, sho) { const o = shoOffset(p); return [sho[0] - o.x, sho[1] - o.y, sho[2] - o.z]; }

// ---------- solve a pose into joint positions ----------
export function solve(p) {
  const P = vec(p.pelvis); const T = torsoFrame(p);
  const mid = P.clone().addScaledVector(T.u1, D.spineLo);
  const top = mid.clone().addScaledVector(T.u2, D.spineHi);
  const J = { P, mid, top, T, sho: {}, elb: {}, wri: {}, hand: {}, hip: {}, knee: {}, ank: {}, foot: {} };
  const shoC = P.clone().add(shoOffset(p));
  const hp = (p.head || 0) + T.a2;
  const uh = V(Math.sin(hp), Math.cos(hp), 0), fh = V(Math.cos(hp), -Math.sin(hp), 0);
  J.neck0 = top.clone().addScaledVector(T.u2, -0.02);
  J.neck1 = J.neck0.clone().addScaledVector(uh, D.neck);
  J.headC = J.neck1.clone().addScaledVector(uh, 0.1).addScaledVector(fh, 0.012);
  J.uh = uh; J.fh = fh;
  for (const s of [1, -1]) {
    const k = s > 0 ? 'R' : 'L';
    const g = (key) => p[key + k] !== undefined ? p[key + k] : mir(p[key], s);
    const gs = (key, def) => p[key + k] !== undefined ? p[key + k] : (p[key] !== undefined ? p[key] : def);
    // arm
    const S = shoC.clone().addScaledVector(Zv, s * D.shoW); J.sho[k] = S;
    let E, W;
    if (g('E')) { E = vec(g('E')); const F = vec(g('F')).normalize(); W = E.clone().addScaledVector(F, D.fore); }
    else {
      let tgt = g('h') ? vec(g('h')) : S.clone().add(vec(g('hRel') || [0.02, -0.53, 0.02 * s]));
      if (g('hRel') && g('h') === undefined) tgt = S.clone().add(vec(g('hRel')));
      [E, W] = ik(S, tgt, D.upper, D.fore, vec(g('e') || [-1, -0.1, 0.25 * s]).normalize(), 'arm' + k);
    }
    J.elb[k] = E; J.wri[k] = W;
    const f = W.clone().sub(E).normalize();
    let n = orth(vec(g('n') || [0, 0, -s]), f); if (n.lengthSq() < 1e-6) n = orth(V(1, 0, 0), f); n.normalize();
    let hd, hn, ht;
    if (g('Dh')) {
      hd = vec(g('Dh')).normalize(); hn = orth(vec(g('n') || [0, 0, -s]), hd).normalize();
      ht = hd.clone().cross(hn).multiplyScalar(s).normalize();
    } else {
      const wf = gs('wf', 0), wd = gs('wd', 0);
      hd = f.clone().multiplyScalar(Math.cos(wf)).addScaledVector(n, Math.sin(wf));
      hn = n.clone().multiplyScalar(Math.cos(wf)).addScaledVector(f, -Math.sin(wf));
      ht = hd.clone().cross(hn).multiplyScalar(s).normalize();
      const hd2 = hd.clone().multiplyScalar(Math.cos(wd)).addScaledVector(ht, Math.sin(wd));
      const ht2 = ht.clone().multiplyScalar(Math.cos(wd)).addScaledVector(hd, -Math.sin(wd));
      hd = hd2.normalize(); ht = ht2.normalize();
    }
    const grip = gs('grip', 0.25);
    J.hand[k] = { W, hd, hn, ht, grip, s, G: W.clone().addScaledVector(hd, 0.058).addScaledVector(hn, 0.034) };
    // leg
    const H = P.clone().addScaledVector(T.u1, -D.hipDrop).addScaledVector(Zv, s * D.hipW); J.hip[k] = H;
    let A = g('a') ? vec(g('a')) : H.clone().add(vec(g('aRel') || [0.02, -0.84, 0.03 * s]));
    const [K, An] = ik(H, A, D.thigh, D.shin, vec(g('k') || [1, 0, 0]).normalize(), 'leg' + k);
    J.knee[k] = K; J.ank[k] = An;
    const toe = vec(g('t') || [1, 0, 0]).normalize();
    let up = orth(vec(g('fu') || [0, 1, 0]), toe); if (up.lengthSq() < 1e-6) up = orth(V(-1, 0, 0), toe); up.normalize();
    J.foot[k] = { A: An, toe, up };
  }
  J.shoC = shoC;
  return J;
}

// ---------- scene ----------
export class Studio {
  constructor() {
    const { w, h, ss } = OUT;
    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(1); this.gl.setSize(w * ss, h * ss, false);
    this.gl.toneMapping = THREE.NeutralToneMapping; this.gl.toneMappingExposure = 1.0;
    this.gl.shadowMap.enabled = true; this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.gl);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.38;
    this.camera = new THREE.PerspectiveCamera(28, w / h, 0.05, 60);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a90a4, 0.55); this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff4e8, 3.1);
    key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.radius = 9; key.shadow.blurSamples = 20;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015;
    this.key = key; this.scene.add(key); this.scene.add(key.target);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.45); fill.position.set(1, 1.2, 4); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(-3.5, 3, 1.5); this.rim = rim; this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.2, color: 0x1a1d2e }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    this.mats = {};
    const M = (c, r = .5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    this.mats.skin = M(PAL.skin, .42); this.mats.joint = M(PAL.joint, .42); this.mats.tint = M(PAL.tint, .38);
    this.mats.steel = M(PAL.steel, .28, .9); this.mats.graphite = M(PAL.graphite, .4, .35); this.mats.rubber = M(PAL.rubber, .7);
    this.mats.wood = M(PAL.wood, .55); this.mats.woodDark = M(PAL.woodDark, .6); this.mats.band = M(PAL.band, .5); this.mats.pad = M(PAL.pad, .55);
    // compositor
    this.out = document.createElement('canvas'); this.out.width = w; this.out.height = h;
    this.cx = this.out.getContext('2d');
    this.bg = makeBackdrop(w, h);
  }
  add(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); this.scene.add(o); return o; }
  setShadowBox(c, r) {
    const k = this.key; k.position.set(c[0] + 3.2, c[1] + 5.0, c[2] - 0.9); k.target.position.set(...c);
    const sc = k.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.5; sc.far = 14; sc.updateProjectionMatrix();
  }
}

function makeBackdrop(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6f7fa'); g.addColorStop(0.62, '#eceef3'); g.addColorStop(1, '#dfe2ea');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const r = x.createRadialGradient(w * .5, h * .46, h * .1, w * .5, h * .5, w * .75);
  r.addColorStop(0, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = r; x.fillRect(0, 0, w, h);
  // dither to kill banding after H.264
  const id = x.getImageData(0, 0, w, h); const d = id.data; let s = 1234567;
  for (let i = 0; i < d.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = ((s >> 16) & 7) - 3.5; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0); return c;
}

// ---------- mesh helpers ----------
const cylGeo = (r1, r2, seg = 28) => new THREE.CylinderGeometry(r2, r1, 1, seg, 1, true);
const sph = (r) => new THREE.SphereGeometry(r, 32, 20);
export function setSeg(m, A, B) {
  const d = B.clone().sub(A); const L = d.length();
  m.position.copy(A).addScaledVector(d, 0.5); m.scale.set(1, Math.max(L, 1e-4), 1);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
}
function basisQ(x, y) { const z = x.clone().cross(y).normalize(); const yy = z.clone().cross(x).normalize(); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x.clone().normalize(), yy, z)); }
export { basisQ };

// ---------- mannequin ----------
export class Mannequin {
  constructor(st, tint = []) {
    this.st = st; const g = this.g = new THREE.Group(); const m = st.mats;
    const mat = (name, base = m.skin) => tint.includes(name) ? m.tint : base;
    const mk = (geo, mt) => { const x = new THREE.Mesh(geo, mt); g.add(x); return x; };
    this.p = {};
    const P = this.p;
    this.torso = new Torso(); P.torso = mk(this.torso.geo, mat('torso'));
    P.neck = mk(cylGeo(0.043, 0.038), m.skin); P.head = mk(sph(1), m.skin); P.nose = mk(sph(0.018), m.skin);
    for (const k of ['R', 'L']) {
      P['up' + k] = mk(cylGeo(0.047, 0.038), mat('upper' + k));
      P['fo' + k] = mk(cylGeo(0.037, 0.027), mat('fore' + k));
      P['th' + k] = mk(cylGeo(0.078, 0.054), mat('thigh' + k));
      P['sh' + k] = mk(cylGeo(0.05, 0.034), mat('shin' + k));
      P['jS' + k] = mk(sph(0.056), m.joint); P['jE' + k] = mk(sph(0.039), m.joint); P['jW' + k] = mk(sph(0.028), m.joint);
      P['jH' + k] = mk(sph(0.07), m.joint); P['jK' + k] = mk(sph(0.055), m.joint); P['jA' + k] = mk(sph(0.036), m.joint);
      P['palm' + k] = mk(new RoundedBoxGeometry(0.085, 0.03, 0.078, 3, 0.013), mat('hand' + k, m.skin));
      P['f1' + k] = mk(new RoundedBoxGeometry(0.046, 0.024, 0.072, 3, 0.011), mat('hand' + k, m.skin));
      P['f2' + k] = mk(new RoundedBoxGeometry(0.042, 0.021, 0.07, 3, 0.01), mat('hand' + k, m.skin));
      P['th1' + k] = mk(cylGeo(0.015, 0.012, 16), mat('hand' + k, m.skin));
      P['tt' + k] = mk(sph(0.012), mat('hand' + k, m.skin));
      P['foot' + k] = mk(new RoundedBoxGeometry(0.235, 0.07, 0.092, 4, 0.03), m.skin);
    }
    st.add(g);
  }
  update(J) {
    const P = this.p, T = J.T;
    this.torso.update(J);
    setSeg(P.neck, J.neck0, J.neck1);
    P.head.position.copy(J.headC); P.head.quaternion.copy(basisQ(J.fh, J.uh)); P.head.scale.set(0.098, 0.118, 0.083);
    P.nose.position.copy(J.headC).addScaledVector(J.fh, 0.094).addScaledVector(J.uh, -0.01);
    for (const k of ['R', 'L']) {
      const S = J.sho[k], E = J.elb[k], W = J.wri[k], H = J.hip[k], K = J.knee[k], A = J.ank[k];
      setSeg(P['up' + k], S, E); setSeg(P['fo' + k], E, W); setSeg(P['th' + k], H, K); setSeg(P['sh' + k], K, A);
      P['jS' + k].position.copy(S); P['jE' + k].position.copy(E); P['jW' + k].position.copy(W);
      P['jH' + k].position.copy(H); P['jK' + k].position.copy(K); P['jA' + k].position.copy(A);
      // hand
      const h = J.hand[k]; const q = basisQ(h.hd, h.hn);
      P['palm' + k].position.copy(W).addScaledVector(h.hd, 0.048); P['palm' + k].quaternion.copy(q);
      const kn = W.clone().addScaledVector(h.hd, 0.088);
      const a1 = h.grip * 1.45, a2 = h.grip * 1.5;
      const d1 = h.hd.clone().multiplyScalar(Math.cos(a1)).addScaledVector(h.hn, Math.sin(a1));
      const n1 = h.hn.clone().multiplyScalar(Math.cos(a1)).addScaledVector(h.hd, -Math.sin(a1));
      P['f1' + k].position.copy(kn).addScaledVector(d1, 0.021); P['f1' + k].quaternion.copy(basisQ(d1, n1));
      const j2 = kn.clone().addScaledVector(d1, 0.044);
      const d2 = d1.clone().multiplyScalar(Math.cos(a2)).addScaledVector(n1, Math.sin(a2));
      const n2 = n1.clone().multiplyScalar(Math.cos(a2)).addScaledVector(d1, -Math.sin(a2));
      P['f2' + k].position.copy(j2).addScaledVector(d2, 0.02); P['f2' + k].quaternion.copy(basisQ(d2, n2));
      const tb = W.clone().addScaledVector(h.hd, 0.022).addScaledVector(h.ht, 0.036).addScaledVector(h.hn, 0.006);
      const tdir = h.hd.clone().multiplyScalar(0.75).addScaledVector(h.ht, 0.35 - 0.3 * h.grip).addScaledVector(h.hn, 0.15 + 0.55 * h.grip).normalize();
      const tt = tb.clone().addScaledVector(tdir, 0.058);
      setSeg(P['th1' + k], tb, tt); P['tt' + k].position.copy(tt);
      // foot
      const f = J.foot[k];
      P['foot' + k].position.copy(A).addScaledVector(f.toe, 0.055).addScaledVector(f.up, -0.035);
      P['foot' + k].quaternion.copy(basisQ(f.toe, f.up));
    }
  }
}

// ---------- equipment ----------
export function dumbbell(st, len = 0.13, plateR = 0.056, plateL = 0.07, oneEnd = false) {
  const g = new THREE.Group(); const m = st.mats;
  const hl = oneEnd ? 0.26 : len;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, hl, 24), m.steel); g.add(handle);
  const hexG = new THREE.CylinderGeometry(plateR, plateR, plateL, 6); hexG.rotateY(Math.PI / 6);
  const ends = oneEnd ? [hl / 2 + plateL / 2 - 0.005] : [-(hl / 2 + plateL / 2), hl / 2 + plateL / 2];
  for (const y of ends) {
    const p = new THREE.Mesh(new RoundedHex(plateR, plateL), m.rubber); p.position.y = y; g.add(p);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(plateR * 0.42, plateR * 0.42, plateL + 0.004, 24), m.steel); cap.position.y = y; g.add(cap);
  }
  if (oneEnd) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 20), m.steel); c.position.y = -hl / 2; g.add(c); }
  g.userData.hl = hl; return st.add(g);
}
class RoundedHex extends THREE.CylinderGeometry { constructor(r, l) { super(r, r, l, 6, 1); this.rotateY(Math.PI / 6); } }
// place a dumbbell in a hand: axis along thumb direction, centred in the fist. shift moves it along the axis.
export function holdDB(db, h, shift = 0) {
  db.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(Y, h.ht));
  db.position.copy(h.G).addScaledVector(h.ht, shift);
}
export function box(st, w, hgt, d, mat, r = 0.012) { const b = new THREE.Mesh(new RoundedBoxGeometry(w, hgt, d, 3, r), mat); return st.add(b); }
export function cyl(st, r, len, mat, seg = 24) { return st.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat)); }
export function strand(st, r, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat); return st.add(m); }
export function tube(st, r, mat) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); st.add(m);
  m.userData.set = (pts) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10, false); };
  return m;
}
export function loadingPin(st, plates = 2) {
  const g = new THREE.Group(); const m = st.mats;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.36, 20), m.steel); pin.position.y = 0.18; g.add(pin);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 24), m.steel); base.position.y = 0.01; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 10, 24), m.steel); ring.position.y = 0.382; g.add(ring);
  for (let i = 0; i < plates; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.036, 48), m.rubber); p.position.y = 0.04 + i * 0.038; g.add(p);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.038, 24), m.steel); hub.position.y = p.position.y; g.add(hub);
  }
  g.userData.top = 0.382; return st.add(g);
}

// ---------- overlay ----------
export function drawOverlay(st, spec, info, J) {
  const x = st.cx, { w, h } = OUT;
  // phase chips
  const chips = spec.chips; const H = 64, pad = 26, gap = 12, y0 = h - H - 34;
  x.font = '600 40px "Barlow Condensed"';
  const ws = chips.map(c => x.measureText(c).width + pad * 2);
  let cx0 = 40;
  chips.forEach((c, i) => {
    const active = info.chip === i; const cw = ws[i];
    x.save();
    rr(x, cx0, y0, cw, H, 14);
    x.fillStyle = active ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.72)'; x.shadowColor = 'rgba(20,22,40,0.12)'; x.shadowBlur = 16; x.shadowOffsetY = 4; x.fill();
    x.shadowColor = 'transparent';
    if (active) {
      x.save(); rr(x, cx0, y0, cw, H, 14); x.clip();
      x.fillStyle = PAL.accent; x.fillRect(cx0, y0, cw * info.prog, H);
      x.restore();
      x.lineWidth = 3; x.strokeStyle = PAL.accent; rr(x, cx0 + 1.5, y0 + 1.5, cw - 3, H - 3, 12.5); x.stroke();
    }
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const tx = cx0 + pad, ty = y0 + H / 2 + 2, label = c;
    if (active) {
      // two-tone text: white over the fill, accent beyond it
      x.save(); x.beginPath(); x.rect(cx0, y0, cw * info.prog, H); x.clip(); x.fillStyle = '#fff'; x.fillText(label, tx, ty); x.restore();
      x.save(); x.beginPath(); x.rect(cx0 + cw * info.prog, y0, cw, H); x.clip(); x.fillStyle = PAL.accent; x.fillText(label, tx, ty); x.restore();
    } else { x.fillStyle = '#7a7d8c'; x.fillText(label, tx, ty); }
    x.restore();
    cx0 += cw + gap;
  });
  // cues
  for (const c of (spec.cues || [])) {
    const a = cueAlpha(c, info); if (a <= 0.01) continue;
    const p3 = typeof c.at === 'function' ? c.at(J) : c.at; const sp = project(st, p3);
    const lx = sp.x + c.off[0], ly = sp.y + c.off[1];
    x.save(); x.globalAlpha = a;
    x.font = '600 36px "Barlow"'; const tw = x.measureText(c.text).width; const bw = tw + 40, bh = 58;
    let left = c.off[0] < 0; let bx = left ? lx - bw : lx;
    if (bx + bw > w - 24) { left = true; bx = sp.x - Math.abs(c.off[0]) - bw; }
    if (bx < 24) { left = false; bx = sp.x + Math.abs(c.off[0]); }
    bx = Math.max(24, Math.min(w - 24 - bw, bx));
    const lyc = Math.max(24 + bh / 2, Math.min(h - 130 - bh / 2, ly)); const by = lyc - bh / 2;
    x.strokeStyle = PAL.ink; x.lineWidth = 3; x.beginPath(); x.moveTo(sp.x, sp.y); x.lineTo(left ? bx + bw : bx, lyc); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(sp.x, sp.y, 9, 0, 7); x.fill(); x.lineWidth = 4; x.strokeStyle = PAL.ink; x.stroke();
    rr(x, bx, by, bw, bh, 12); x.fillStyle = PAL.ink; x.shadowColor = 'rgba(0,0,0,0.18)'; x.shadowBlur = 14; x.shadowOffsetY = 4; x.fill(); x.shadowColor = 'transparent';
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(c.text, bx + 20, lyc + 2);
    x.restore();
  }
}
function cueAlpha(c, info) {
  // visible while current segment index is in c.seg, with fades at edges
  if (!c.seg.includes(info.seg)) {
    return 0;
  }
  const first = !c.seg.includes(info.prevSeg), last = !c.seg.includes(info.nextSeg);
  let a = 1; const fin = 0.22;
  if (first) a = Math.min(a, info.segT / fin);
  if (last) a = Math.min(a, (info.segD - info.segT) / fin);
  return Math.max(0, Math.min(1, a));
}
export function project(st, p) {
  const v = (p.isVector3 ? p.clone() : V(...p)).project(st.camera);
  return { x: (v.x + 1) / 2 * OUT.w, y: (1 - v.y) / 2 * OUT.h };
}
export function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

// ---------- timeline ----------
export function buildTimeline(spec) {
  let acc = { ...spec.base }; const poses = [];
  for (const s of spec.segs) { acc = { ...acc, ...(s.to || {}) }; poses.push(acc); }
  const total = spec.segs.reduce((a, s) => a + s.d, 0);
  return { poses, total };
}
export function sampleAt(spec, tl, t) {
  t = ((t % tl.total) + tl.total) % tl.total;
  let i = 0, t0 = 0;
  while (t0 + spec.segs[i].d <= t && i < spec.segs.length - 1) { t0 += spec.segs[i].d; i++; }
  const seg = spec.segs[i]; const u = Math.min(1, (t - t0) / seg.d);
  const e = seg.ease === 'lin' ? u : seg.ease === 'out' ? easeOut(u) : ease(u);
  const A = tl.poses[(i - 1 + tl.poses.length) % tl.poses.length], B = tl.poses[i];
  const p = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[k] ?? B[k], b = B[k] ?? A[k];
    if (typeof a === 'number') p[k] = lerp(a, b, e);
    else if (Array.isArray(a)) p[k] = a.map((v, j) => lerp(v, b[j], e));
    else p[k] = b;
  }
  const n = spec.segs.length;
  return {
    p, info: {
      seg: i, prevSeg: (i - 1 + n) % n, nextSeg: (i + 1) % n, segT: t - t0, segD: seg.d, u, e,
      chip: seg.chip, prog: chipProgress(spec, i, t - t0),
    }
  };
}
// progress across all consecutive segments sharing a chip
function chipProgress(spec, i, segT) {
  const c = spec.segs[i].chip; if (c === undefined || c === null) return 0;
  let a = i, b = i; const n = spec.segs.length;
  while (a > 0 && spec.segs[a - 1].chip === c) a--;
  while (b < n - 1 && spec.segs[b + 1].chip === c) b++;
  let tot = 0, before = 0; for (let j = a; j <= b; j++) { tot += spec.segs[j].d; if (j < i) before += spec.segs[j].d; }
  return Math.min(1, (before + segT) / tot);
}

// ---------- continuous torso surface swept along the spine ----------
const PROF = [[0, .06, .05], [.05, .13, .085], [.15, .158, .1], [.32, .148, .095], [.52, .13, .088], [.68, .15, .1], [.8, .172, .108], [.9, .168, .095], [.96, .12, .07], [1, .05, .045]];
function prof(t) { let i = 0; while (i < PROF.length - 2 && PROF[i + 1][0] < t) i++; const a = PROF[i], b = PROF[i + 1]; const u = (t - a[0]) / (b[0] - a[0]); const e = u * u * (3 - 2 * u); return [a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]; }
class Torso {
  constructor(NS = 40, NR = 36) {
    this.NS = NS; this.NR = NR; const g = this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(NS * NR * 3); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = []; for (let i = 0; i < NS - 1; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = i * NR + (j + 1) % NR, c = a + NR, d = b + NR; idx.push(a, c, b, b, c, d); }
    // caps
    g.setIndex(idx);
  }
  update(J) {
    const { T } = J; const B0 = J.P.clone().addScaledVector(T.u1, -0.13), B1 = J.mid, B2 = J.top.clone().addScaledVector(T.u2, 0.03);
    const L0 = B0.distanceTo(B1), L1 = B1.distanceTo(B2), tm = L0 / (L0 + L1);
    const { NS, NR, pos } = this; let k = 0;
    for (let i = 0; i < NS; i++) {
      const t = i / (NS - 1);
      let c, f, u;
      if (t <= tm) { const s = t / tm; c = B0.clone().lerp(B1, s); const w = Math.max(0, (s - .7) / .3) * .5; f = T.f1.clone().lerp(T.f2, w).normalize(); u = T.u1.clone().lerp(T.u2, w).normalize(); }
      else { const s = (t - tm) / (1 - tm); c = B1.clone().lerp(B2, s); const w = .5 + Math.min(1, s / .3) * .5; f = T.f1.clone().lerp(T.f2, w).normalize(); u = T.u1.clone().lerp(T.u2, w).normalize(); }
      const [wz, dx] = prof(t); const fwd = t > .6 && t < .95 ? 0.012 * Math.sin((t - .6) / .35 * Math.PI) : 0;
      for (let j = 0; j < NR; j++) {
        const th = j / NR * Math.PI * 2; const cs = Math.cos(th), sn = Math.sin(th);
        const e = 2 / 2.6; const px = Math.sign(cs) * Math.pow(Math.abs(cs), e) * dx, pz = Math.sign(sn) * Math.pow(Math.abs(sn), e) * wz;
        pos[k++] = c.x + f.x * (px + fwd) + pz * Zv.x; pos[k++] = c.y + f.y * (px + fwd) + pz * Zv.y; pos[k++] = c.z + f.z * (px + fwd) + pz * Zv.z;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals(); this.geo.computeBoundingSphere();
  }
}
