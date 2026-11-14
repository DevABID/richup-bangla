// Small hand-drawn country flags (simplified for tiny sizes), so they load
// instantly, work offline and look the same on every device. Flag emoji show
// up as plain letters on Windows, which is why emoji aren't used.
// Add a country: add its two-letter code below with a 30×20 drawing.

const star = (cx, cy, r, rot = -90) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const d = i % 2 ? r * 0.42 : r;
    return `${(cx + d * Math.cos(a)).toFixed(2)},${(cy + d * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

const stripes = (colors, vertical = false) =>
  colors.map((c, i) => {
    const n = colors.length;
    return vertical
      ? <rect key={i} x={(30 / n) * i} y="0" width={30 / n + 0.05} height="20" fill={c} />
      : <rect key={i} x="0" y={(20 / n) * i} width="30" height={20 / n + 0.05} fill={c} />;
  });

const qatarEdge = () => {
  const pts = ["0,0", "8,0"];
  for (let i = 0; i < 9; i++) pts.push(`11.5,${(i * 20) / 9 + 20 / 18}`, `8,${((i + 1) * 20) / 9}`);
  pts.push("0,20");
  return pts.join(" ");
};

const trigram = (x, y, angle) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`} fill="#000">
    <rect x="-2.6" y="-1.9" width="5.2" height="0.8" />
    <rect x="-2.6" y="-0.4" width="5.2" height="0.8" />
    <rect x="-2.6" y="1.1" width="5.2" height="0.8" />
  </g>
);

const FLAGS = {
  bd: <><rect width="30" height="20" fill="#006a4e" /><circle cx="13.5" cy="10" r="6" fill="#f42a41" /></>,
  np: (
    <>
      <polygon points="1.5,0.8 19,9.3 7.5,9.3 19,19.2 1.5,19.2" fill="#dc143c" stroke="#003893" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="6.2" cy="6.6" r="1.6" fill="#fff" />
      <polygon points={star(6.2, 14.6, 2.2)} fill="#fff" />
    </>
  ),
  lk: (
    <>
      <rect width="30" height="20" fill="#ffbe29" />
      <rect x="1" y="1" width="3.6" height="18" fill="#00534e" />
      <rect x="4.6" y="1" width="3.6" height="18" fill="#eb7400" />
      <rect x="9.2" y="1" width="19.8" height="18" fill="#8d153a" />
      <ellipse cx="19.1" cy="10" rx="4.2" ry="3.4" fill="#ffbe29" />
    </>
  ),
  th: (
    <>
      <rect width="30" height="20" fill="#a51931" />
      <rect y="3.33" width="30" height="13.34" fill="#f4f5f8" />
      <rect y="6.67" width="30" height="6.66" fill="#2d2a4a" />
    </>
  ),
  my: (
    <>
      {Array.from({ length: 14 }, (_, i) => (
        <rect key={i} y={(20 / 14) * i} width="30" height={20 / 14 + 0.05} fill={i % 2 ? "#fff" : "#cc0001"} />
      ))}
      <rect width="15" height={(20 / 14) * 8} fill="#010066" />
      <circle cx="5.6" cy="5.7" r="3.6" fill="#fc0" />
      <circle cx="6.8" cy="5.7" r="3" fill="#010066" />
      <polygon points={star(11.2, 5.7, 2.4)} fill="#fc0" />
    </>
  ),
  sg: (
    <>
      {stripes(["#ef3340", "#fff"])}
      <circle cx="5.2" cy="5" r="3.3" fill="#fff" />
      <circle cx="6.5" cy="5" r="3" fill="#ef3340" />
      {[[9.3, 3], [11.1, 4.2], [10.4, 6.4], [8.2, 6.4], [7.5, 4.2]].map(([x, y], i) => (
        <polygon key={i} points={star(x, y, 0.75)} fill="#fff" />
      ))}
    </>
  ),
  tr: (
    <>
      <rect width="30" height="20" fill="#e30a17" />
      <circle cx="11" cy="10" r="5" fill="#fff" />
      <circle cx="12.3" cy="10" r="4" fill="#e30a17" />
      <polygon points={star(17.2, 10, 2.4, 180)} fill="#fff" />
    </>
  ),
  qa: <><rect width="30" height="20" fill="#8a1538" /><polygon points={qatarEdge()} fill="#fff" /></>,
  ae: (
    <>
      {stripes(["#00732f", "#fff", "#000"])}
      <rect width="7.5" height="20" fill="#ff0000" />
    </>
  ),
  kr: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <g transform="rotate(33.7 15 10)">
        <path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a" />
        <path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0" />
        <circle cx="12.5" cy="10" r="2.5" fill="#cd2e3a" />
        <circle cx="17.5" cy="10" r="2.5" fill="#0047a0" />
      </g>
      {trigram(6, 4.3, -56.3)}
      {trigram(24, 15.7, -56.3)}
      {trigram(24, 4.3, 56.3)}
      {trigram(6, 15.7, 56.3)}
    </>
  ),
  cn: (
    <>
      <rect width="30" height="20" fill="#de2910" />
      <polygon points={star(5, 5, 3)} fill="#ffde00" />
      {[[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y], i) => (
        <polygon key={i} points={star(x, y, 1)} fill="#ffde00" />
      ))}
    </>
  ),
  jp: <><rect width="30" height="20" fill="#fff" /><circle cx="15" cy="10" r="6" fill="#bc002d" /></>,
  it: stripes(["#009246", "#fff", "#ce2b37"], true),
  es: (
    <>
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </>
  ),
  pt: (
    <>
      <rect width="30" height="20" fill="#ff0000" />
      <rect width="12" height="20" fill="#006600" />
      <circle cx="12" cy="10" r="4.2" fill="none" stroke="#ffe900" strokeWidth="1.4" />
      <rect x="10.4" y="8" width="3.2" height="4.2" rx="0.8" fill="#fff" stroke="#ff0000" strokeWidth="0.8" />
    </>
  ),
  gb: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.4" />
    </>
  ),
  nl: stripes(["#ae1c28", "#fff", "#21468b"]),
  de: stripes(["#000", "#dd0000", "#ffce00"]),
  fr: stripes(["#0055a4", "#fff", "#ef4135"], true),
  ca: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="7.5" height="20" fill="#d52b1e" />
      <rect x="22.5" width="7.5" height="20" fill="#d52b1e" />
      <polygon
        fill="#d52b1e"
        points="15,3.2 16.2,5.8 17.8,5.1 17.2,8.5 19.4,7.2 19.9,8.4 21.9,8.1 21.1,10.3 22.1,10.9 18.4,13.9 18.8,15.3 15.4,14.7 15.4,17.4 14.6,17.4 14.6,14.7 11.2,15.3 11.6,13.9 7.9,10.9 8.9,10.3 8.1,8.1 10.1,8.4 10.6,7.2 12.8,8.5 12.2,5.1 13.8,5.8"
      />
    </>
  ),
  us: (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} y={(20 / 13) * i} width="30" height={20 / 13 + 0.05} fill={i % 2 ? "#fff" : "#b22234"} />
      ))}
      <rect width="12" height={(20 / 13) * 7} fill="#3c3b6e" />
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={i} cx={1.4 + (i % 5) * 2.3} cy={1.3 + Math.floor(i / 5) * 2.4} r="0.55" fill="#fff" />
      ))}
    </>
  ),
  ch: (
    <>
      <rect width="30" height="20" fill="#da291c" />
      <rect x="13" y="4" width="4" height="12" fill="#fff" />
      <rect x="9" y="8" width="12" height="4" fill="#fff" />
    </>
  ),
  mc: stripes(["#ce1126", "#fff"]),
};

// Round badges show a 20×20 window of the flag. Most are centred; flags whose
// key feature sits on the left (a canton, star or stripe) are cropped from there.
const ROUND_X = { us: 0, my: 0, cn: 0, sg: 0, ae: 1.5, qa: 1.5, lk: 1, pt: 2, tr: 1, bd: 3.5, np: 0 };

export default function Flag({ code, className = "", round = false }) {
  const art = FLAGS[code];
  if (!art) return null;
  if (round) {
    const x = ROUND_X[code] ?? 5;
    return (
      <svg className={`flag flag-round ${className}`} viewBox={`${x} 0 20 20`} role="img" aria-hidden="true">
        <rect x={x} width="20" height="20" fill="#fff" />
        {art}
      </svg>
    );
  }
  return (
    <svg className={`flag ${code === "np" ? "flag-shaped" : ""} ${className}`} viewBox="0 0 30 20"
      role="img" aria-hidden="true">
      {art}
    </svg>
  );
}
