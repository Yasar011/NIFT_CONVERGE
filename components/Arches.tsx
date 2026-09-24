// Jharokha-arch composition — the five arenas as five coloured arches,
// a nod to Jodhpur's carved windows. Purely decorative.

const ARCH = "M0 200 V78 Q0 26 50 0 Q100 26 100 78 V200 Z";
const INNER = "M16 200 V84 Q16 44 50 22 Q84 44 84 84 V200";

const ARCHES = [
  { x: 0, y: 70, fill: "var(--sindoor)", stroke: "var(--paper)" },
  { x: 86, y: 30, fill: "var(--rani)", stroke: "var(--paper)" },
  { x: 172, y: 0, fill: "var(--blue)", stroke: "var(--paper)" },
  { x: 258, y: 40, fill: "var(--marigold)", stroke: "var(--ink)" },
  { x: 344, y: 90, fill: "var(--peacock)", stroke: "var(--paper)" },
];

export default function Arches({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 444 300" className={className} aria-hidden>
      {/* sun */}
      <circle cx="360" cy="46" r="34" fill="var(--marigold)" stroke="var(--ink)" strokeWidth="2" />
      {ARCHES.map((a, i) => (
        <g key={i} transform={`translate(${a.x} ${a.y})`}>
          <path d={ARCH} fill={a.fill} stroke="var(--ink)" strokeWidth="2" />
          <path d={INNER} fill="none" stroke={a.stroke} strokeWidth="1.5" strokeDasharray="0" opacity="0.7" />
          <circle cx="50" cy="104" r="6" fill={a.stroke} opacity="0.85" />
        </g>
      ))}
      <rect x="0" y="270" width="444" height="30" fill="var(--ink)" />
      {Array.from({ length: 22 }).map((_, i) => (
        <path key={i} d={`M${i * 20 + 4} 285 l6 -6 l6 6 l-6 6 z`} fill="var(--paper)" />
      ))}
    </svg>
  );
}

export function ArchMark({ className, fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden>
      <path d={ARCH} fill={fill} />
    </svg>
  );
}
