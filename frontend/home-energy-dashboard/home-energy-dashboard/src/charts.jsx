function Spark({ data, color = "var(--blue)" }) {
  const max = Math.max(...data) * 1.1 || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return <svg viewBox="0 0 100 30" width="100%" height="30" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}
function Bars({ values, labels, unit }) {
  const W = 600, H = 180, P = { l: 38, b: 22, t: 8, r: 6 }, max = Math.max(...values) * 1.1 || 1;
  const bw = (W - P.l - P.r) / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={"Energy use per period in " + unit}>
      {[0, 0.5, 1].map(t => <g key={t}><line x1={P.l} x2={W - P.r} y1={H - P.b - t * (H - P.b - P.t)} y2={H - P.b - t * (H - P.b - P.t)} stroke="var(--line)" /><text x={P.l - 4} y={H - P.b - t * (H - P.b - P.t) + 3} textAnchor="end">{(t * max).toFixed(0)}</text></g>)}
      {values.map((v, i) => { const hh = (v / max) * (H - P.b - P.t), last = i === values.length - 1; return (
        <g key={i}><rect x={P.l + i * bw + 3} y={H - P.b - hh} width={bw - 6} height={hh} rx="2" fill={last ? "var(--blue)" : "var(--mute)"} opacity={last ? 1 : 0.4} />
        {(values.length <= 8 || i % 2 === 0 || last) && <text x={P.l + i * bw + bw / 2} y={H - 7} textAnchor="middle">{labels[i]}</text>}</g>); })}
    </svg>
  );
}
function Live({ data }) {
  const W = 600, H = 150, P = 34, max = Math.max(...data) * 1.15 || 1;
  const pts = data.map((v, i) => `${P + (i / (data.length - 1)) * (W - P - 6)},${H - 8 - (v / max) * (H - 18)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Whole-home load over the last two minutes">
      {[0, 0.5, 1].map(t => <g key={t}><line x1={P} x2={W - 6} y1={H - 8 - t * (H - 18)} y2={H - 8 - t * (H - 18)} stroke="var(--line)" /><text x={P - 4} y={H - 5 - t * (H - 18)} textAnchor="end">{(t * max).toFixed(1)}</text></g>)}
      <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export { Spark, Bars, Live };
