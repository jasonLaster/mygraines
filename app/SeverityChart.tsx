import type { Reading } from "@/lib/severity";

const W = 320;
const H = 136;
const PAD = { left: 26, right: 12, top: 16, bottom: 26 };

function clock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Severity over the life of a migraine as a step line: a reading holds its
 * value until the next one. `endTime` null means still going, drawn up to `now`.
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
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const last = readings[readings.length - 1];
  const spanEnd = Math.max(endTime ?? now, last.at, startTime + 60_000);

  const x = (at: number) =>
    PAD.left + ((at - startTime) / (spanEnd - startTime)) * plotW;
  const y = (severity: number) => PAD.top + (1 - severity / 10) * plotH;

  let line = `M ${x(readings[0].at)} ${y(readings[0].severity)}`;
  for (let i = 1; i < readings.length; i++) {
    line += ` H ${x(readings[i].at)} V ${y(readings[i].severity)}`;
  }
  line += ` H ${x(spanEnd)}`;
  const area = `${line} V ${y(0)} H ${x(readings[0].at)} Z`;

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
      {[5, 10].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-gray-700"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text
            x={PAD.left - 6}
            y={y(tick) + 3}
            textAnchor="end"
            className="fill-gray-500"
            fontSize={9}
          >
            {tick}
          </text>
        </g>
      ))}

      <path d={area} className="fill-primary/15" />
      <path
        d={line}
        className="stroke-primary"
        fill="none"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {readings.map((r, i) => (
        <g key={`${r.at}-${i}`}>
          <circle
            cx={x(r.at)}
            cy={y(r.severity)}
            r={4}
            className="fill-background-dark stroke-primary"
            strokeWidth={2}
          />
          <text
            x={x(r.at)}
            y={y(r.severity) - 9}
            textAnchor="middle"
            className="fill-gray-200"
            fontSize={10}
            fontWeight={700}
          >
            {r.severity}
          </text>
        </g>
      ))}

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
