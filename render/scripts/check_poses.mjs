import { solve, buildTimeline, sampleAt, warnings } from '../engine.js';
import { EX, ORDER } from '../exercises.js';
const f=v=>v.toArray().map(x=>x.toFixed(3)).join(',');
for (const n of ORDER){ const s=EX[n]; const tl=buildTimeline(s); warnings.length=0;
  let lowFoot=9, lowHand=9;
  for(let i=0;i<=60;i++){ const {p,info}=sampleAt(s,tl,tl.total*i/60); s.pre&&s.pre(p); const J=solve(p);
    lowFoot=Math.min(lowFoot,J.ank.R.y,J.ank.L.y); }
  const w=[...new Set(warnings)]; console.log(n.padEnd(10), 'T=',tl.total.toFixed(2),'minAnk',lowFoot.toFixed(3), w.slice(0,4).join(' | '));
}
