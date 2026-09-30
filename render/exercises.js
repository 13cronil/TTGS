// Choreography for every clip. World: floor y=0, figure faces +X, figure's right side is +Z.
import * as THREE from 'three';
import { V, D, ARM, pelvisFor, shoOffset, dumbbell, holdDB, box, cyl, strand, tube, loadingPin, setSeg } from './engine.js';

const DEG = Math.PI / 180;
const STAND = { pelvis: [0, 0.95, 0], pitch: 0, curl: 0, shrug: 0, a: [0.03, 0.075, 0.105], k: [1, 0, 0.05], t: [1, 0, 0.1], grip: 0.25 };

// ---------- shared rigs ----------
function pullRig(st) {
  const m = st.mats;
  for (const z of [-0.64, 0.64]) {
    const u = box(st, 0.05, 2.52, 0.05, m.graphite, 0.01); u.position.set(-0.05, 1.26, z);
    const f = box(st, 0.62, 0.05, 0.08, m.graphite, 0.01); f.position.set(-0.05, 0.025, z);
  }
  const top = box(st, 0.06, 0.06, 1.34, m.graphite, 0.01); top.position.set(-0.05, 2.52, 0);
  const bar = cyl(st, 0.016, 1, m.steel); bar.rotation.x = Math.PI / 2; bar.scale.y = 1.28; bar.position.set(0, 2.32, 0);
  for (const z of [-0.64, 0.64]) { const c = box(st, 0.1, 0.07, 0.07, m.graphite, 0.01); c.position.set(-0.02, 2.32, z); }
}
const BAR = 2.32, GRIPZ = 0.28;
// wrist position so the fist closes around the bar (overhand)
const barWrist = [-0.034, BAR - 0.058, GRIPZ];

function seatBox(st) {
  const b = box(st, 0.42, 0.44, 0.46, st.mats.pad, 0.025); b.position.set(-0.08, 0.22, 0);
}

// seated, forearm along the thigh, hand past the knee
const SEAT = {
  pelvis: [0, 0.535, 0], pitch: 0.56, curl: 0.06, shrug: 0, head: -0.25,
  a: [0.46, 0.075, 0.15], k: [1, 0.5, 0.1], t: [1, 0, 0.12],
  E: [0.205, 0.628, 0.135], F: [1, -0.05, 0], grip: 1,
  EL: [0.2, 0.625, -0.14], FL: [1, -0.1, 0.05], nL: [0, -1, 0], wfL: 0.55, gripL: 0.3,
};

// ---------- specs ----------
export const EX = {};

EX.pullup = (() => {
  const hang = { shrug: 0.035, pitch: 0.02, curl: 0, aRel: [0.07, -0.825, -0.04], t: [0.45, -0.89, 0], fu: [0.89, 0.45, 0], k: [1, 0, 0] };
  const set = { ...hang, shrug: -0.03 };
  const top = { shrug: -0.02, pitch: -0.14, curl: -0.02, head: -0.12, aRel: [0.15, -0.8, -0.04] };
  const sho = { hang: [-0.04, 1.726, 0], top: [-0.13, 2.165, 0] };
  const P = (p, s) => ({ ...p, pelvis: pelvisFor(p, s) });
  return {
    chips: ['SET SHOULDERS', 'PULL · 1s', 'LOWER · 2s'],
    cam: { look: [0, 1.45, 0], az: 36, el: 4, dist: 5.0, orbit: 5 },
    shadow: { c: [0, 1.2, 0], r: 1.8 },
    base: { ...P(hang, sho.hang), h: barWrist, Dh: [0, 1, 0], n: [1, 0, 0], e: [0.35, -1, 0.95], grip: 1 },
    segs: [
      { d: 0.45, to: {} },
      { d: 0.6, chip: 0, to: P(set, sho.hang) },
      { d: 1.0, chip: 1, to: P({ ...set, ...top }, sho.top) },
      { d: 0.35, chip: 1 },
      { d: 2.0, chip: 2, to: P(set, sho.hang) },
      { d: 0.55, to: P(hang, sho.hang) },
    ],
    cues: [
      { seg: [1], text: 'Shoulders down first', at: J => J.sho.R, off: [150, 40] },
      { seg: [2, 3], text: 'Chin over the bar', at: J => J.headC, off: [190, -30] },
    ],
    props: st => { pullRig(st); },
  };
})();

EX.kneeraise = (() => {
  const s0 = { shrug: -0.01, pitch: 0.02, curl: 0, aRel: [0.07, -0.825, -0.04], t: [0.45, -0.89, 0], fu: [0.89, 0.45, 0], k: [1, 0, 0] };
  const tilt = { ...s0, pitch: -0.05, curl: 0.1, aRel: [0.14, -0.815, -0.04] };
  const up = { ...tilt, pitch: -0.1, curl: 0.16, aRel: [0.46, -0.43, -0.04], k: [1, 0.35, 0], t: [0.55, -0.83, 0], fu: [0.83, 0.55, 0] };
  const S = [-0.04, 1.735, 0];
  const P = p => ({ ...p, pelvis: pelvisFor(p, S) });
  return {
    chips: ['TILT PELVIS', 'KNEES UP', 'LOWER · 2s'],
    cam: { look: [0.08, 1.45, 0], az: 58, el: 3, dist: 5.8, orbit: 5 },
    shadow: { c: [0, 1.2, 0], r: 1.8 },
    base: { ...P(s0), h: barWrist, Dh: [0, 1, 0], n: [1, 0, 0], e: [0.35, -1, 0.95], grip: 1 },
    segs: [
      { d: 0.4 },
      { d: 0.6, chip: 0, to: P(tilt) },
      { d: 1.1, chip: 1, to: P(up) },
      { d: 0.45, chip: 1 },
      { d: 1.9, chip: 2, to: P(tilt) },
      { d: 0.45, to: P(s0) },
    ],
    cues: [
      { seg: [2, 3], text: 'Knees to hip height', at: J => J.knee.R, off: [150, -60] },
      { seg: [4], text: 'No swing', at: J => J.P, off: [-170, 40] },
    ],
    props: st => { pullRig(st); },
  };
})();

EX.lsit = (() => {
  const HX = 0, HY = 0.215, HZ = 0.235;
  const W = [HX, HY + 0.058, HZ + 0.034];
  const tuck = { pitch: 0.1, curl: 0.04, shrug: -0.03, head: 0, aRel: [0.2, -0.17, -0.025], k: [1, 1, 0], t: [0.35, -0.94, 0], fu: [0.94, 0.35, 0] };
  const S = [-0.03, W[1] + 0.538, 0];
  const P = p => ({ ...p, pelvis: pelvisFor(p, S) });
  const legOut = { aRelR: [0.845, 0.03, -0.01], kR: [0, 1, 0], tR: [1, 0.12, 0], fuR: [-0.12, 1, 0] };
  const legIn = { aRelR: tuck.aRel, kR: tuck.k, tR: tuck.t, fuR: tuck.fu };
  const legOutL = { aRelL: [0.845, 0.03, 0.01], kL: [0, 1, 0], tL: [1, 0.12, 0], fuL: [-0.12, 1, 0] };
  const legInL = { aRelL: [0.2, -0.17, 0.025], kL: tuck.k, tL: tuck.t, fuL: tuck.fu };
  const base = { ...P(tuck), h: W, Dh: [0, -1, 0], n: [0, 0, -1], e: [-1, 0, 0.3], grip: 1, ...legIn, ...legInL };
  return {
    chips: ['TUCK HOLD', 'ONE LEG OUT'],
    cam: { look: [0.25, 0.52, 0], az: 42, el: 8, dist: 3.5, orbit: 5 },
    shadow: { c: [0.2, 0.3, 0], r: 1.2 },
    base,
    segs: [
      { d: 1.5, chip: 0 },
      { d: 0.9, chip: 1, to: legOut },
      { d: 1.0, chip: 1 },
      { d: 0.8, chip: 1, to: legIn },
      { d: 0.9, chip: 1, to: legOutL },
      { d: 1.0, chip: 1 },
      { d: 0.8, chip: 1, to: legInL },
    ],
    cues: [
      { seg: [0], text: 'Push down, shoulders low', at: J => J.sho.R, off: [160, -60] },
      { seg: [1, 2], text: 'Straighten one leg', at: J => J.ank.R, off: [60, -130] },
    ],
    props: st => {
      const m = st.mats;
      for (const z of [-HZ, HZ]) {
        const b = cyl(st, 0.019, 1, m.wood); b.rotation.z = Math.PI / 2; b.scale.y = 0.46; b.position.set(HX, HY, z);
        for (const x of [-0.17, 0.17]) {
          const l = box(st, 0.03, HY, 0.03, m.graphite, 0.006); l.position.set(HX + x, HY / 2, z);
          const f = box(st, 0.05, 0.02, 0.2, m.graphite, 0.008); f.position.set(HX + x, 0.01, z);
        }
      }
    },
  };
})();

EX.seated = (() => {
  const W = [0.035, 0.032, 0.265];
  const slump = { pitch: 0.12, curl: 0.3, shrug: 0.01, head: 0.05 };
  const tall = { pitch: -0.04, curl: -0.02, shrug: -0.03, head: 0 };
  const legDown = { aRel: [0.845, -0.004, -0.02] }, legUp = { aRel: [0.838, 0.1, -0.02] };
  const Pv = (p) => ({ ...p, pelvis: [0, 0.112, 0] });
  return {
    chips: ['SIT TALL', 'LIFT', 'HOLD 3s', 'LOWER'],
    cam: { look: [0.36, 0.34, 0], az: 76, el: 7, dist: 3.3, orbit: 5 },
    shadow: { c: [0.3, 0.2, 0], r: 1.2 },
    base: { ...Pv(slump), ...legDown, k: [0, 1, 0], t: [0.3, 0.95, 0.08], fu: [-0.95, 0.3, 0], h: W, Dh: [1, 0, 0.1], n: [0, -1, 0], e: [-1, 0, 0.35], grip: 0 },
    segs: [
      { d: 0.35 },
      { d: 0.7, chip: 0, to: Pv(tall) },
      { d: 0.8, chip: 1, to: legUp },
      { d: 2.6, chip: 2 },
      { d: 1.1, chip: 3, to: legDown },
      { d: 0.5, to: Pv(slump) },
    ],
    cues: [
      { seg: [1], text: 'Chest up, back long', at: J => J.top.clone().add(V(0.1, 0, 0)), off: [120, -70] },
      { seg: [2, 3], text: 'Heels just clear', at: J => J.ank.R.clone().add(V(0, -0.05, 0)), off: [-40, -150] },
    ],
    props: st => { },
  };
})();

EX.rockback = (() => {
  const KN = [0, 0.055, 0], W = [0.49, 0.03, 0.2];
  // place hips on an arc around the knee, then find the torso angle that keeps straight arms
  function pre(p) {
    const al = p.rock;
    const H = V(KN[0] + D.thigh * Math.sin(al), KN[1] + D.thigh * Math.cos(al), 0);
    let best = null;
    for (let pit = 0.9; pit <= 1.9; pit += 0.002) {
      const u1 = V(Math.sin(pit), Math.cos(pit), 0);
      const P = H.clone().addScaledVector(u1, D.hipDrop);
      const q = { ...p, pitch: pit };
      const S = P.clone().add(shoOffset(q)).add(V(0, 0, D.shoW));
      const err = Math.abs(S.distanceTo(V(...W)) - (ARM - 0.012));
      if (!best || err < best.err) best = { err, pit, P };
    }
    p.pitch = best.pit; p.pelvis = [best.P.x, best.P.y, 0];
  }
  return {
    chips: ['ROCK FORWARD', 'ROCK BACK'],
    cam: { look: [0.12, 0.34, 0], az: 58, el: 12, dist: 3.4, orbit: 5 },
    shadow: { c: [0.1, 0.2, 0], r: 1.1 },
    pre,
    base: { rock: 0, pelvis: [0, 0.5, 0], curl: -0.05, shrug: -0.01, head: -0.3, a: [-0.405, 0.045, 0.105], k: [0.1, -1, 0], t: [-1, -0.12, 0], fu: [0.12, -1, 0], h: W, Dh: [1, 0, 0], n: [0, -1, 0], e: [-1, 0, 0.2], grip: 0 },
    segs: [
      { d: 1.2, chip: 0, to: { rock: 0.42 } },
      { d: 0.35, chip: 0 },
      { d: 1.4, chip: 1, to: { rock: -0.55 } },
      { d: 0.35, chip: 1 },
    ],
    cues: [
      { seg: [0, 1], text: 'Hands flat, fingers forward', at: J => J.hand.R.W.clone().add(V(0.05, 0, 0.02)), off: [110, -110] },
    ],
    props: st => { },
  };
})();

// block pull and pinch share a rig: object hangs from the right hand on a cord to a loading pin
function hangRig(kind) {
  return st => {
    const m = st.mats;
    let blk;
    if (kind === 'block') {
      blk = new THREE.Group();
      const b = box(st, 0.15, 0.08, 0.045, m.wood, 0.008); blk.add(b);
      const lip = box(st, 0.15, 0.012, 0.03, m.woodDark, 0.004); lip.position.set(0, 0.041, 0.005); blk.add(lip);
      st.add(blk);
    } else {
      blk = new THREE.Group();
      const b = box(st, 0.11, 0.1, 0.075, m.wood, 0.012); blk.add(b);
      st.add(blk);
    }
    const hb = kind === 'block' ? 0.035 : 0.05;
    const pin = loadingPin(st, 2);
    const cord = tube(st, 0.0065, m.band);
    const L = kind === 'block' ? 0.29 : 0.29;
    return {
      update(J) {
        const h = J.hand.R;
        const c = kind === 'block'
          ? h.W.clone().addScaledVector(h.hd, 0.118).addScaledVector(h.hn, 0.028)
          : h.W.clone().addScaledVector(h.hd, 0.1).addScaledVector(h.hn, 0.052);
        blk.position.copy(c);
        const bot = c.clone().add(V(0, -hb, 0));
        const rest = pin.userData.top;
        const taut = bot.y - L;
        const topY = Math.max(rest, taut);
        pin.position.set(bot.x, topY - rest, bot.z);
        const pt = V(bot.x, topY, bot.z);
        const slack = Math.max(0, rest - taut);
        const midp = bot.clone().lerp(pt, 0.5).add(V(0.03 * (slack > 0 ? 1 : 0) + slack * 0.8, 0, slack * 0.4));
        cord.userData.set([bot, midp, pt]);
      }
    };
  };
}

EX.blockpull = (() => {
  const S = { pelvis: [0, 0.95, 0], pitch: 0.01, shrug: -0.025 };
  const dip = { pelvis: [-0.04, 0.885, 0], pitch: 0.2, shrug: 0.0 };
  const arm = { hRelR: [0.03, -0.53, 0.115], eR: [-1, 0, 0.3], nR: [0, 0, -1], gripR: 0.58, hRelL: [0.02, -0.53, -0.03], gripL: 0.25 };
  return {
    chips: ['LIFT', 'HOLD 10s', 'PUT DOWN'],
    cam: { look: [0.08, 0.8, 0.12], az: 40, el: 8, dist: 4.6, orbit: 5 },
    shadow: { c: [0, 0.8, 0.1], r: 1.4 },
    tint: ['foreR', 'handR'],
    base: { ...STAND, ...dip, ...arm, aL: [0.01, 0.075, -0.105], aR: [0.03, 0.075, 0.12] },
    segs: [
      { d: 0.5 },
      { d: 0.75, chip: 0, to: S },
      { d: 1.5, chip: 1 },
      { d: 1.5, chip: 1 },
      { d: 0.75, chip: 2, to: dip },
      { d: 0.3 },
    ],
    cues: [
      { seg: [1, 2], text: 'Stand tall, shoulder down', at: J => J.sho.R, off: [150, -50] },
      { seg: [3], text: 'Weight just off the floor', at: J => V(J.hand.R.W.x, 0.1, J.hand.R.W.z + 0.1), off: [130, -40] },
    ],
    props: hangRig('block'),
  };
})();

EX.pinch = (() => {
  const S = { pelvis: [0, 0.95, 0], pitch: 0.01, shrug: -0.025 };
  const dip = { pelvis: [-0.04, 0.885, 0], pitch: 0.2, shrug: 0.0 };
  const arm = { hRelR: [0.03, -0.52, 0.13], eR: [-1, 0, 0.3], nR: [0, 0, -1], gripR: 0.32, wfR: -0.42, hRelL: [0.02, -0.53, -0.03], gripL: 0.25 };
  return {
    chips: ['LIFT', 'HOLD 10s', 'PUT DOWN'],
    cam: { look: [0.08, 0.8, 0.14], az: 36, el: 8, dist: 4.5, orbit: 5 },
    shadow: { c: [0, 0.8, 0.1], r: 1.4 },
    tint: ['foreR', 'handR'],
    base: { ...STAND, ...dip, ...arm, aL: [0.01, 0.075, -0.105], aR: [0.03, 0.075, 0.12] },
    segs: [
      { d: 0.5 },
      { d: 0.75, chip: 0, to: S },
      { d: 1.5, chip: 1 },
      { d: 1.5, chip: 1 },
      { d: 0.75, chip: 2, to: dip },
      { d: 0.3 },
    ],
    cues: [
      { seg: [1, 2], text: 'Wrist cocked back', at: J => J.wri.R, off: [150, -60] },
      { seg: [3], text: 'Arm straight', at: J => J.elb.R, off: [150, -40] },
    ],
    props: hangRig('pinch'),
  };
})();

EX.dbpress = (() => {
  const body = { pelvis: [0.3, 0.548, 0], pitch: -Math.PI / 2, curl: 0, shrug: 0, protract: -0.022, head: 0.05, a: [0.74, 0.075, 0.2], k: [0.4, 1, 0.25], t: [1, 0, 0.12] };
  const low = { h: [-0.1, 0.66, 0.3], e: [0.5, -1, 0.85] }, high = { h: [-0.165, 1.065, 0.135] };
  return {
    chips: ['PRESS · 1s', 'LOWER · 2s'],
    cam: { look: [-0.05, 0.6, 0], az: 64, el: 20, dist: 4.1, orbit: 5 },
    shadow: { c: [0, 0.5, 0], r: 1.4 },
    base: { ...body, ...low, Dh: [0, 1, 0], n: [1, 0, 0], grip: 1 },
    segs: [
      { d: 1.0, chip: 0, to: high },
      { d: 0.3, chip: 0 },
      { d: 2.0, chip: 1, to: low },
      { d: 0.4, chip: 1 },
    ],
    cues: [
      { seg: [0, 1], text: 'Shoulder blades pinned', at: J => J.sho.R.clone().add(V(0, -0.02, 0.03)), off: [170, 60] },
      { seg: [2, 3], text: 'Elbows about 45° from body', at: J => J.elb.R, off: [170, 70] },
    ],
    props: st => {
      const m = st.mats;
      const pad = box(st, 1.24, 0.08, 0.29, m.pad, 0.03); pad.position.set(-0.17, 0.4, 0);
      const rail = box(st, 1.1, 0.05, 0.08, m.graphite, 0.01); rail.position.set(-0.17, 0.335, 0);
      for (const x of [-0.66, 0.32]) {
        const l = box(st, 0.06, 0.32, 0.06, m.graphite, 0.01); l.position.set(x, 0.17, 0);
        const f = box(st, 0.07, 0.04, 0.44, m.graphite, 0.01); f.position.set(x, 0.02, 0);
      }
      const dR = dumbbell(st), dL = dumbbell(st);
      return { update(J) { holdDB(dR, J.hand.R); holdDB(dL, J.hand.L); } };
    },
  };
})();

EX.facepull = (() => {
  const body = { ...STAND, pitch: -0.02, shrug: -0.01 };
  const out = { h: [0.53, 1.44, 0.095], e: [-0.3, -1, 0.8], n: [0, -0.35, -1], grip: 1 };
  const inn = { h: [0.0, 1.625, 0.305], e: [-0.35, 0.05, 1], n: [1, 0.1, -0.1] };
  const ANCH = V(1.78, 1.56, 0);
  return {
    chips: ['PULL, ELBOWS HIGH', 'PAUSE 1s', 'SLOW RETURN'],
    cam: { look: [0.62, 1.02, 0], az: 112, el: 8, dist: 4.7, orbit: 5 },
    shadow: { c: [0.5, 1, 0], r: 1.8 },
    base: { ...body, ...out },
    segs: [
      { d: 1.0, chip: 0, to: inn },
      { d: 0.9, chip: 1 },
      { d: 1.6, chip: 2, to: out },
      { d: 0.35, chip: 2 },
    ],
    cues: [
      { seg: [1], text: 'Elbows level with shoulders', at: J => J.elb.R, off: [150, -90] },
    ],
    props: st => {
      const m = st.mats;
      const post = box(st, 0.08, 2.3, 0.08, m.graphite, 0.012); post.position.set(1.84, 1.15, 0);
      const foot = box(st, 0.5, 0.05, 0.5, m.graphite, 0.012); foot.position.set(1.84, 0.025, 0);
      const clamp = box(st, 0.1, 0.08, 0.1, m.steel, 0.01); clamp.position.set(1.8, 1.56, 0);
      const bR = strand(st, 0.011, m.band), bL = strand(st, 0.011, m.band);
      return { update(J) { setSeg(bR, ANCH, J.hand.R.G); setSeg(bL, ANCH, J.hand.L.G); } };
    },
  };
})();

EX.curl = (() => {
  const body = { ...STAND, shrug: -0.01 };
  const E = [-0.012, 1.118, 0.2];
  const wr = a => [E[0] + D.fore * Math.sin(a), E[1] - D.fore * Math.cos(a), 0.2];
  const low = { h: wr(12 * DEG), n: [1, 0, 0] };
  const high = { h: wr(128 * DEG), n: [-0.8, 0.6, 0] };
  return {
    chips: ['UP · 1s', 'DOWN · 4s'],
    cam: { look: [0.06, 0.93, 0], az: 74, el: 6, dist: 4.25, orbit: 5 },
    shadow: { c: [0, 1, 0], r: 1.4 },
    base: { ...body, ...low, e: [-1, 0, -0.04], grip: 1 },
    segs: [
      { d: 1.0, chip: 0, to: high },
      { d: 0.25, chip: 0 },
      { d: 4.0, chip: 1, to: low, ease: 'lin' },
      { d: 0.45, chip: 1 },
    ],
    cues: [
      { seg: [0, 1], text: 'Elbows pinned to your sides', at: J => J.elb.R, off: [160, 20] },
      { seg: [3], text: 'Stop just short of straight', at: J => J.hand.R.G, off: [150, 40] },
    ],
    props: st => {
      const dR = dumbbell(st), dL = dumbbell(st);
      return { update(J) { holdDB(dR, J.hand.R); holdDB(dL, J.hand.L); } };
    },
  };
})();

// ----- wrist battery: seated on a box, forearm on thigh -----
function wristSpec({ chips, segs, base, cues, oneEnd, shift = 0, pre, cam }) {
  return {
    chips, pre,
    cam: cam || { look: [0.4, 0.71, 0.12], az: 82, el: 8, dist: 1.9, orbit: 4 },
    shadow: { c: [0.2, 0.5, 0], r: 1.0 },
    tint: ['foreR', 'handR'],
    base: { ...SEAT, ...base },
    segs, cues,
    props: st => {
      seatBox(st);
      const d = dumbbell(st, 0.13, 0.05, 0.06, oneEnd);
      return { update(J, p) { holdDB(d, J.hand.R, oneEnd ? shift : (1 - J.hand.R.grip) * 0.0); } };
    },
  };
}
const wristCue = (seg, text, off = [170, -130]) => ({ seg, text, at: J => J.wri.R, off });

EX.wcurl = wristSpec({
  chips: ['CURL UP', 'LOWER SLOWLY'],
  base: { n: [0, 1, 0], wf: -0.95, grip: 0.6 },
  segs: [
    { d: 0.3, to: { grip: 1 } },
    { d: 0.9, chip: 0, to: { wf: 0.85 } },
    { d: 0.25, chip: 0 },
    { d: 1.6, chip: 1, to: { wf: -0.95 } },
    { d: 0.35, chip: 1, to: { grip: 0.6 } },
  ],
  cues: [wristCue([1, 2], 'Palm up, wrist only')],
});

EX.wrev = wristSpec({
  chips: ['LIFT', 'LOWER SLOWLY'],
  base: { n: [0, -1, 0], wf: 0.85, grip: 1 },
  segs: [
    { d: 0.9, chip: 0, to: { wf: -0.75 } },
    { d: 0.25, chip: 0 },
    { d: 1.6, chip: 1, to: { wf: 0.85 } },
    { d: 0.3, chip: 1 },
  ],
  cues: [wristCue([0, 1], 'Palm down, go light')],
});

EX.wrot = wristSpec({
  chips: ['TURN PALM UP', 'TURN PALM DOWN'],
  oneEnd: true, shift: 0.11,
  cam: { look: [0.42, 0.75, 0.08], az: 18, el: 12, dist: 1.95, orbit: 4 },
  pre: p => { p.n = [0, Math.sin(p.rot), -Math.cos(p.rot)]; },
  base: { rot: -1.15, wf: 0 },
  segs: [
    { d: 1.3, chip: 0, to: { rot: 1.15 } },
    { d: 0.25, chip: 0 },
    { d: 1.3, chip: 1, to: { rot: -1.15 } },
    { d: 0.25, chip: 1 },
  ],
  cues: [{ seg: [0, 1, 2, 3], text: 'Forearm stays still', at: J => J.elb.R.clone().lerp(J.wri.R, 0.5), off: [-140, 150] }],
});

EX.wdev = wristSpec({
  chips: ['TILT BACK', 'TILT FORWARD'],
  oneEnd: true, shift: 0.11,
  base: { n: [0, 0, -1], wd: -0.3 },
  segs: [
    { d: 1.1, chip: 0, to: { wd: 0.42 } },
    { d: 0.25, chip: 0 },
    { d: 1.1, chip: 1, to: { wd: -0.3 } },
    { d: 0.25, chip: 1 },
  ],
  cues: [{ seg: [0, 1, 2, 3], text: 'Small range, wrist only', at: J => J.wri.R, off: [-150, 150] }],
});

export const ORDER = ['rockback', 'blockpull', 'pullup', 'dbpress', 'facepull', 'curl', 'seated', 'kneeraise', 'lsit', 'wcurl', 'wrev', 'wrot', 'wdev', 'pinch'];
