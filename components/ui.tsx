import clsx from "clsx";
import { STATUS_META, type Status } from "@/lib/dates";

export function StatusPill({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", m.pill)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function ProgressBar({ value, color = "#7C5CFA", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={clsx("h-1.5 overflow-hidden rounded-full bg-ink-100", className)}>
      <div className="h-full rounded-full transition-[width]" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 56, stroke = 6, color = "#7C5CFA", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eceef6" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-[stroke-dashoffset]" />
      </svg>
      <div className="absolute text-[13px] font-semibold">{children}</div>
    </div>
  );
}
