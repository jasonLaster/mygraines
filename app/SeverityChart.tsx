import { useId } from "react";
import type { Reading } from "@/lib/severity";

const W = 320;
const H = 132;
const PAD = { left: 14, right: 14, top: 18, bottom: 26 };

function clock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const n = (value: number) => Number(value.toFixed(1));

/**
 * Severity over the life of a migraine as a smooth curve. Between two readings
 * the line eases from one level to the next (flat tangents at each reading, so
 * it can never overshoot), then holds the latest level until the end. The
 * highest point is marked. `endTime` null means still going, drawn up to `now`.
 */
export function SeverityChart({
  readings,
  startTime,
  endTime,
  now,
  className,
}: {
  readings: readonly Reading[];
  startTime: number;
  endTime: number | null;
  now: number;
  className?: string;
}) {
  const gradientId = `severity-fill-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const last = readings[readings.length - 1];
  const spanEnd = Math.max(endTime ?? now, last.at, startTime + 60_000);

  const x = (at: number) =>
    PAD.left + ((at - startTime) / (spanEnd - startTime)) * plotW;
  // Fixed 0-10 scale so heights are comparable between migraines.
  const y = (severity: number) => PAD.top + (1 - severity / 10) * plotH;

  const points = readings.map((r) => ({ x: x(r.at), y: y(r.severity) }));

  let line = `M ${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const mid = (from.x + to.x) / 2;
    line += ` C ${n(mid)} ${n(from.y)}, ${n(mid)} ${n(to.y)}, ${n(to.x)} ${n(to.y)}`;
  }
  line += ` H ${n(x(spanEnd))}`;
  const area = `${line} V ${n(y(0))} H ${n(points[0].x)} Z`;

  const peakIndex = readings.reduce(
    (best, r, i) => (r.severity > readings[best].severity ? i : best),
    0,
  );

  const summary = readings
    .map((r) => `${r.severity} at ${clock(r.at)}`)
    .join(", then ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Severity over time: ${summary}`}
      className={className ?? "w-full"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: 0.42 }} />
          <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      {/* Baseline */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(0)}
        y2={y(0)}
        className="stroke-gray-800"
        strokeWidth={1}
      />

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        className="stroke-primary"
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 5px rgba(168, 85, 247, 0.55))" }}
      />

      {readings.map((r, i) =>
        i === peakIndex ? (
          <g key={`${r.at}-${i}`}>
            <circle
              cx={points[i].x}
              cy={points[i].y}
              r={10}
              className="fill-primary"
              opacity={0.18}
            />
            <circle
              cx={points[i].x}
              cy={points[i].y}
              r={5}
              className="fill-primary stroke-background-dark"
              strokeWidth={2}
            />
          </g>
        ) : (
          <circle
            key={`${r.at}-${i}`}
            cx={points[i].x}
            cy={points[i].y}
            r={3.5}
            className="fill-background-dark stroke-primary"
            strokeWidth={2}
          />
        ),
      )}

      <text
        x={PAD.left}
        y={H - 8}
        textAnchor="start"
        className="fill-gray-500"
        fontSize={10}
      >
        {clock(startTime)}
      </text>
      <text
        x={W - PAD.right}
        y={H - 8}
        textAnchor="end"
        className="fill-gray-500"
        fontSize={10}
      >
        {endTime === null ? "Now" : clock(endTime)}
      </text>
    </svg>
  );
}
