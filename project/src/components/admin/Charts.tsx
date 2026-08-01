import { useState } from 'react';
import { faNum } from '../../utils/dates';

// ─────────── Line / Area Chart ───────────
export function LineChart({
  data,
  color = '#2c6440',
  height = 220,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const W = 560;
  const H = height;
  const PAD = { top: 16, right: 10, bottom: 30, left: 10 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({
    x: PAD.left + (innerW / Math.max(data.length - 1, 1)) * i,
    y: PAD.top + innerH - (d.value / max) * innerH,
    ...d,
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${path} L${points.length ? points[points.length - 1].x : 0},${PAD.top + innerH} L${points.length ? points[0].x : 0},${PAD.top + innerH} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[480px]" role="img" aria-label="نمودار خطی">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * (1 - f)}
            y2={PAD.top + innerH * (1 - f)}
            stroke="#e5e9e6"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#8fa393">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─────────── Bar Chart ───────────
export function BarChart({
  data,
  color = '#3d7d52',
  height = 220,
  valueLabel,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  valueLabel?: (v: number) => string;
}) {
  const W = 560;
  const H = height;
  const PAD = { top: 20, right: 10, bottom: 30, left: 10 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(46, (innerW / Math.max(data.length, 1)) * 0.6);
  const step = innerW / Math.max(data.length, 1);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[480px]" role="img" aria-label="نمودار ستونی">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + innerH * (1 - f)}
            y2={PAD.top + innerH * (1 - f)}
            stroke="#e5e9e6"
            strokeDasharray="4 4"
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = PAD.left + step * i + (step - barW) / 2;
          const y = PAD.top + innerH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} rx="4" fill={color} opacity="0.85" />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="9" fill="#5b6f5f" fontWeight="bold">
                {valueLabel ? valueLabel(d.value) : faNum(d.value)}
              </text>
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#8fa393">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────── Pie / Donut Chart ───────────
export function PieChart({ data, size = 180 }: { data: { label: string; value: number; color?: string }[]; size?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const COLORS = ['#2c6440', '#c4882e', '#5e9b71', '#ddbd6b', '#234f33', '#a86b25'];
  const total = Math.max(data.reduce((s, d) => s + d.value, 0), 1);
  const R = 80;
  const CX = size / 2;
  const CY = size / 2;

  let angle = -90;
  const segs = data.map((d, i) => {
    const start = angle;
    const sweep = (d.value / total) * 360;
    angle += sweep;
    const large = sweep > 180 ? 1 : 0;
    const x1 = CX + R * Math.cos((start * Math.PI) / 180);
    const y1 = CY + R * Math.sin((start * Math.PI) / 180);
    const x2 = CX + R * Math.cos(((start + sweep) * Math.PI) / 180);
    const y2 = CY + R * Math.sin(((start + sweep) * Math.PI) / 180);
    return {
      ...d,
      color: d.color || COLORS[i % COLORS.length],
      path: sweep >= 360 ? '' : `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="نمودار دایره‌ای">
        <circle cx={CX} cy={CY} r={R} fill="#f3f7f4" />
        {segs.map((s, i) =>
          s.path ? (
            <path
              key={i}
              d={s.path}
              fill={s.color}
              stroke="#fff"
              strokeWidth="2"
              opacity={active === null || active === i ? 1 : 0.4}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ) : null
        )}
        <circle cx={CX} cy={CY} r={R * 0.55} fill="#fff" />
        {active !== null && segs[active] ? (
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1d3f2a">
            {segs[active].label}
          </text>
        ) : (
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1d3f2a">
            {faNum(Math.round((data[0]?.value ?? 0) / total * 100))}٪
          </text>
        )}
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="9" fill="#8fa393">
          {faNum(total)}
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {segs.map((s, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${active === null || active === i ? 'opacity-100' : 'opacity-40'}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
            <span className="text-forest-700">{s.label}</span>
            <span className="text-forest-400 text-xs">{faNum(Math.round((s.value / total) * 100))}٪</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────── Heatmap (روزهای شلوغ) ───────────
export function Heatmap({
  data,
  days = 30,
}: {
  data: { date: string; label: string; occupancy: number }[];
  days?: number;
}) {
  const cells = data.slice(0, days);
  const max = Math.max(...cells.map((d) => d.occupancy), 1);

  const colorFor = (v: number) => {
    const f = v / max;
    if (f <= 0.15) return '#eef4ef';
    if (f <= 0.4) return '#cfe2d4';
    if (f <= 0.65) return '#8fbd9d';
    if (f <= 0.85) return '#5e9b71';
    return '#2c6440';
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-fr gap-1.5 min-w-[420px]" dir="ltr">
        {cells.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="h-10 w-full rounded-md"
              style={{ background: colorFor(d.occupancy) }}
              title={`${d.label} — اشغال ${faNum(d.occupancy)}٪`}
            />
            <span className="text-[9px] text-forest-400">{d.label.split('/')[2]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-forest-400" dir="ltr">
        <span>کم</span>
        {['#eef4ef', '#cfe2d4', '#8fbd9d', '#5e9b71', '#2c6440'].map((c) => (
          <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />
        ))}
        <span>زیاد</span>
      </div>
    </div>
  );
}
