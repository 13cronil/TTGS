import * as THREE from 'three';
import { OUT, Studio, Mannequin, solve, buildTimeline, sampleAt, drawOverlay, project, warnings, V } from './engine.js';
import { EX } from './exercises.js';

const name = new URLSearchParams(location.search).get('ex');
const spec = EX[name];
const st = new Studio();
const man = new Mannequin(st, spec.tint || []);
const props = spec.props(st) || {};
const tl = buildTimeline(spec);
st.setShadowBox(spec.shadow.c, spec.shadow.r);
document.body.appendChild(st.out);
st.out.style.width = '100%';

function poseAt(t) {
  const { p, info } = sampleAt(spec, tl, t);
  if (spec.pre) spec.pre(p, t, info);
  return { J: solve(p), p, info };
}
// precompute trail in world space
let trail = null;
if (spec.trail) { trail = []; for (let i = 0; i <= 120; i++) trail.push(spec.trail(poseAt(tl.total * i / 120).J).clone()); }

function placeCam(t) {
  const c = spec.cam; const az = (c.az + (c.orbit || 0) * Math.sin(2 * Math.PI * t / tl.total)) * Math.PI / 180, el = c.el * Math.PI / 180;
  const L = V(...c.look);
  st.camera.position.set(L.x + c.dist * Math.cos(el) * Math.cos(az), L.y + c.dist * Math.sin(el), L.z + c.dist * Math.cos(el) * Math.sin(az));
  st.camera.fov = c.fov || 28; st.camera.updateProjectionMatrix(); st.camera.lookAt(L);
}

window.renderAt = (t, overlay = true) => {
  const { J, p, info } = poseAt(t);
  man.update(J); props.update && props.update(J, p, info, t);
  placeCam(t);
  st.gl.render(st.scene, st.camera);
  const x = st.cx; const { w, h } = OUT;
  x.globalAlpha = 1; x.drawImage(st.bg, 0, 0);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(st.gl.domElement, 0, 0, w, h);
  if (trail) {
    const pts = trail.map(q => project(st, q));
    x.save(); x.setLineDash([2, 13]); x.lineCap = 'round'; x.lineWidth = 6; x.strokeStyle = 'rgba(58,65,204,0.55)';
    x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)); x.stroke(); x.restore();
    const c = project(st, spec.trail(J));
    x.save(); x.fillStyle = '#3a41cc'; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(c.x, c.y, 11, 0, 7); x.fill(); x.stroke(); x.restore();
  }
  if (overlay) drawOverlay(st, spec, info, J);
  return info;
};
window.meta = { total: tl.total, fps: OUT.fps, frames: Math.round(tl.total * OUT.fps) };
window.grab = (type = 'image/jpeg', q = 0.95) => st.out.toDataURL(type, q);
window.warnings = warnings;
document.fonts.ready.then(async () => {
  await Promise.all(['600 40px "Barlow Condensed"', '700 40px "Barlow Condensed"', '600 36px "Barlow"'].map(f => document.fonts.load(f)));
  window.renderAt(0); window.READY = true;
});
