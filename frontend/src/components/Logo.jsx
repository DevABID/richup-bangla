import { useTranslation } from "react-i18next";

// The জমিদারি emblem: a zamindar's round seal (মোহর) with a rajbari palace,
// drawn as an SVG so it stays sharp at any size and loads instantly.
const SEAL_EDGE = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const r = i % 2 ? 29.2 : 31;
  return `${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

export function LogoMark({ size = "1em", title }) {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" width={size} height={size} role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"} aria-label={title}>
      <defs>
        <linearGradient id="seal-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#0a2a78" />
        </linearGradient>
      </defs>
      <polygon points={SEAL_EDGE} fill="url(#seal-fill)" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="#bcd3ff" strokeWidth="1.2" strokeDasharray="1.6 2.2" />
      <g fill="#fff">
        {/* central dome with finial */}
        <circle cx="32" cy="11.8" r="1.3" />
        <rect x="31.35" y="12.6" width="1.3" height="3.6" />
        <path d="M25 27.6Q25 18.2 32 16q7 2.2 7 11.6z" />
        {/* side towers with small domes */}
        <path d="M14.4 41.2V31.4h4.4v9.8zM14.4 31.4a2.2 2.2 0 0 1 4.4 0zM45.2 41.2V31.4h4.4v9.8zM45.2 31.4a2.2 2.2 0 0 1 4.4 0z" />
        {/* roof line and main hall */}
        <rect x="18" y="27.2" width="28" height="2.2" rx="0.6" />
        <rect x="19.2" y="29.4" width="25.6" height="11.8" />
        {/* steps */}
        <rect x="16.4" y="41.2" width="31.2" height="2.6" rx="0.6" />
        <rect x="13.2" y="43.8" width="37.6" height="2.8" rx="0.8" />
      </g>
      {/* arched doorways */}
      <g fill="#123d9c">
        {[23.2, 32, 40.8].map((x) => (
          <path key={x} d={`M${x - 2.3} 41.2V36.4a2.3 2.3 0 0 1 4.6 0V41.2z`} />
        ))}
      </g>
    </svg>
  );
}

// Seal + name. The name follows the chosen language (জমিদারি / Jomidari).
export default function Logo({ className = "", size = "1em" }) {
  const { t } = useTranslation();
  const name = t("app.title");
  return (
    <span className={`logo-lockup ${className}`} style={{ fontSize: size }}>
      <LogoMark size="1.15em" />
      <span className="logo-word">{name}</span>
    </span>
  );
}
