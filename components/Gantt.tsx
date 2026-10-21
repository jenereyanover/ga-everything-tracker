"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, getDaysInMonth, getQuarter, isMonday, startOfMonth, startOfQuarter, startOfToday } from "date-fns";
import { ChevronDown, Diamond, LocateFixed } from "lucide-react";
import { AssigneeTags } from "./AssigneePicker";
import { assigneesOf, fmt, parseDate, sectionColor, statusOf } from "@/lib/dates";
import { depsOf } from "@/lib/deps";
import { groupBySection } from "@/lib/group";
import type { Project } from "@/lib/types";

const ZOOMS = {
  day: { label: "Day", px: 38 },
  week: { label: "Week", px: 14 },
  month: { label: "Month", px: 5 },
} as const;
type Zoom = keyof typeof ZOOMS;

const LEFT = 288;
const ROW_H = 46;
const SECTION_H = 36;
const HEADER_H = 84; // quarters + months + day/week ticks

export default function Gantt({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const px = ZOOMS[zoom].px;
  const today = startOfToday();

  const groups = useMemo(() => groupBySection(projects), [projects]);

  const { rangeStart, baseDays } = useMemo(() => {
    const dates = [today];
    projects.forEach((p) => [p.start, p.due, p.release].forEach((s) => { const d = parseDate(s); if (d) dates.push(d); }));
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const rs = startOfMonth(addDays(min, -10));
    const re = endOfMonth(addDays(max, 21));
    return { rangeStart: rs, baseDays: differenceInCalendarDays(re, rs) + 1 };
  }, [projects, today]);

  // keep the calendar at least as wide as the visible area so it never ends in blank space
  const [viewW, setViewW] = useState(1400);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [groups.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  // end on a month boundary so the last month/quarter is never a sliver
  const totalDays = useMemo(() => {
    const need = Math.max(baseDays, Math.ceil((viewW - LEFT) / px) + 7);
    return differenceInCalendarDays(endOfMonth(addDays(rangeStart, need - 1)), rangeStart) + 1;
  }, [baseDays, viewW, px, rangeStart]);

  const x = (d: Date) => differenceInCalendarDays(d, rangeStart) * px;
  const width = totalDays * px;
  const todayX = x(today) + px / 2;

  const scrollToToday = (smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.max(0, todayX - (el.clientWidth - LEFT) / 3), behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToToday();
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // months + sub-ticks
  const months = useMemo(() => {
    const out: { label: string; w: number; left: number }[] = [];
    let d = rangeStart;
    while (differenceInCalendarDays(d, rangeStart) < totalDays) {
      const left = x(d);
      const w = Math.min(getDaysInMonth(d) * px, totalDays * px - left);
      out.push({ label: format(d, zoom === "month" ? "MMM yy" : "MMMM yyyy"), w, left });
      d = addDays(endOfMonth(d), 1);
    }
    return out;
  }, [rangeStart, totalDays, px, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const quarters = useMemo(() => {
    const out: { label: string; left: number; w: number; current: boolean; odd: boolean }[] = [];
    const thisQ = +startOfQuarter(today);
    let d = startOfQuarter(rangeStart);
    while (differenceInCalendarDays(d, rangeStart) < totalDays) {
      const next = addMonths(d, 3);
      const left = Math.max(0, differenceInCalendarDays(d, rangeStart)) * px;
      const right = Math.min(totalDays, differenceInCalendarDays(next, rangeStart)) * px;
      out.push({ label: `Q${getQuarter(d)} ${format(d, "yyyy")}`, left, w: right - left, current: +d === thisQ, odd: getQuarter(d) % 2 === 1 });
      d = next;
    }
    return out;
  }, [rangeStart, totalDays, px, today]);

  // pixel x of each quarter boundary inside the chart, drawn as stronger gridlines
  const quarterXs = useMemo(() => quarters.slice(1).map((q) => q.left), [quarters]);

  const ticks = useMemo(() => {
    if (zoom === "month") return [] as { d: Date; left: number; w: number; label: string }[];
    const out: { d: Date; left: number; w: number; label: string }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(rangeStart, i);
      if (zoom === "day") out.push({ d, left: i * px, w: px, label: format(d, "d") });
      else if (isMonday(d)) out.push({ d, left: i * px, w: 7 * px, label: format(d, "d") });
    }
    return out;
  }, [zoom, totalDays, rangeStart, px]);

  // Bar geometry per visible project, used to draw dependency arrows.
  const { arrows, rowsHeight } = useMemo(() => {
    const geo = new Map<string, { y: number; x1: number; x2: number; p: Project }>();
    let y = 0;
    groups.forEach((g) => {
      y += SECTION_H;
      if (collapsed[g.name]) return;
      g.items.forEach((p) => {
        const s = parseDate(p.start);
        const e = parseDate(p.due);
        const start = s ?? e;
        const end = e ?? s;
        if (start && end) geo.set(p.id, { y: y + ROW_H / 2, x1: x(start), x2: x(end) + px, p });
        y += ROW_H;
      });
    });
    const byId = new Map(projects.map((p) => [p.id, p]));
    const out: { key: string; d: string; late: boolean }[] = [];
    geo.forEach((to, id) => {
      depsOf(to.p, byId).forEach((depId) => {
        const from = geo.get(depId);
        if (!from) return;
        const fx = from.x2, fy = from.y, tx = to.x1, ty = to.y;
        const dir = ty >= fy ? 1 : -1;
        const gap = 12;
        const d =
          tx >= fx + gap * 2
            ? `M${fx} ${fy} H${fx + gap} V${ty} H${tx - 1}`
            : `M${fx} ${fy} H${fx + gap} V${ty - dir * (ROW_H / 2)} H${tx - gap} V${ty} H${tx - 1}`;
        out.push({ key: `${depId}->${id}`, d, late: tx < fx });
      });
    });
    return { arrows: out, rowsHeight: y };
  }, [groups, collapsed, projects, x, px]);

  const gridBg = zoom === "month" ? undefined : `repeating-linear-gradient(to right, #eef0f6 0, #eef0f6 1px, transparent 1px, transparent ${zoom === "day" ? px : px * 7}px)`;
  const gridOffset = zoom === "week" ? ((8 - rangeStart.getDay()) % 7) * px : 0; // align weekly lines to Mondays

  if (!groups.length) return <div className="grid h-full place-items-center text-sm text-ink-400">No projects match.</div>;

  return (
    <div className="flex h-full flex-col px-5 pb-6 pt-4 md:px-8">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-ink-100 p-0.5">
          {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} className={clsx("rounded-md px-3 py-1 text-xs font-medium transition", zoom === z ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900")}>
              {ZOOMS[z].label}
            </button>
          ))}
        </div>
        <button onClick={() => scrollToToday(true)} className="btn-ghost !px-3 !py-1.5 text-xs"><LocateFixed className="h-3.5 w-3.5" /> Today</button>
        <div className="ml-auto flex items-center gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-6 rounded-full bg-brand-500" /> Progress</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-6 rounded-full bg-brand-100" /> Remaining</span>
          <span className="flex items-center gap-1.5"><svg width="22" height="10" aria-hidden><path d="M1 5 H17" stroke="#8f95b0" strokeWidth="1.5" /><path d="M14 1 L21 5 L14 9z" fill="#8f95b0" /></svg> Dependency</span>
          <span className="flex items-center gap-1.5"><Diamond className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Release</span>
        </div>
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-ink-200/70 bg-white shadow-card">
        <div className="relative" style={{ width: LEFT + width, minHeight: "100%" }}>
          {/* header */}
          <div className="sticky top-0 z-30 flex bg-white" style={{ height: HEADER_H }}>
            <div className="sticky left-0 z-40 flex shrink-0 items-end border-b border-r border-ink-200/70 bg-ink-50 px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400" style={{ width: LEFT }}>Project</div>
            <div className="relative border-b border-ink-200/70 bg-ink-50/95" style={{ width }}>
              {quarters.map((q) => (
                <div key={q.left} className={clsx("absolute top-0 flex h-7 items-center overflow-clip whitespace-nowrap border-l border-ink-200 px-3 text-[11px] font-bold uppercase tracking-wider", q.current ? "bg-brand-50 text-brand-700" : q.odd ? "bg-ink-100/60 text-ink-500" : "bg-ink-50 text-ink-500")} style={{ left: q.left, width: q.w }}>
                  <span className="sticky" style={{ left: LEFT + 8 }}>{q.label}{q.current && <span className="ml-2 rounded bg-brand-600 px-1.5 py-px text-[9px] normal-case tracking-normal text-white">Now</span>}</span>
                </div>
              ))}
              {months.map((m) => (
                <div key={m.left} className="absolute top-7 flex h-7 items-center overflow-clip whitespace-nowrap border-l border-ink-200/70 px-3 text-xs font-semibold text-ink-700" style={{ left: m.left, width: m.w }}>
                  <span className="sticky" style={{ left: LEFT + 8 }}>{m.label}</span>
                </div>
              ))}
              {ticks.filter((t) => Math.abs(t.left + (zoom === "day" ? px / 2 : 12) - todayX) > 18).map((t) => (
                <div key={+t.d} className={clsx("absolute top-14 flex h-7 items-center justify-center text-[11px]", zoom === "day" && (t.d.getDay() === 0 || t.d.getDay() === 6) ? "text-ink-300" : "text-ink-400")} style={{ left: t.left, width: t.w }}>
                  {zoom === "week" ? <span className="w-full pl-1">{t.label}</span> : t.label}
                </div>
              ))}
              <div className="absolute top-[58px] z-10 -translate-x-1/2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow" style={{ left: todayX }}>Today</div>
            </div>
          </div>

          {/* rows */}
          {groups.map((g) => {
            const c = sectionColor(g.name);
            const isCollapsed = collapsed[g.name];
            return (
              <div key={g.name}>
                <Row height={SECTION_H} left={
                  <button onClick={() => setCollapsed((s) => ({ ...s, [g.name]: !isCollapsed }))} className="flex w-full items-center gap-2 px-3 text-left">
                    <ChevronDown className={clsx("h-4 w-4 text-ink-400 transition", isCollapsed && "-rotate-90")} />
                    <span className="truncate rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: c.base, color: c.text }}>{g.name}</span>
                    <span className="ml-auto text-xs text-ink-400">{g.avg}%</span>
                  </button>
                } width={width} todayX={todayX} quarterXs={quarterXs} gridBg={gridBg} gridOffset={gridOffset} tint>
                  {/* section summary bar */}
                  {(() => {
                    const ds = g.items.flatMap((p) => [parseDate(p.start), parseDate(p.due)]).filter(Boolean) as Date[];
                    if (!ds.length) return null;
                    const s = ds.reduce((a, b) => (a < b ? a : b));
                    const e = ds.reduce((a, b) => (a > b ? a : b));
                    return <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-60" style={{ left: x(s), width: x(e) - x(s) + px, background: c.fill }} />;
                  })()}
                </Row>

                {!isCollapsed &&
                  g.items.map((p) => (
                    <Row key={p.id} height={ROW_H} width={width} todayX={todayX} quarterXs={quarterXs} gridBg={gridBg} gridOffset={gridOffset}
                      left={
                        <button onClick={() => onOpen(p)} className="flex w-full items-center gap-2.5 px-4 text-left" title={p.name}>
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.fill }} />
                          <span className="truncate text-[13px] font-medium text-ink-900">{p.name}</span>
                          <span className="ml-auto"><AssigneeTags value={assigneesOf(p)} /></span>
                        </button>
                      }>
                      <Bar p={p} c={c} x={x} px={px} onOpen={onOpen} />
                    </Row>
                  ))}
              </div>
            );
          })}

          {arrows.length > 0 && (
            <svg className="pointer-events-none absolute z-[5]" style={{ left: LEFT, top: HEADER_H, width, height: rowsHeight }} aria-hidden>
              <defs>
                <marker id="dep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0 0 L8 4 L0 8 z" fill="#8f95b0" />
                </marker>
                <marker id="dep-arrow-late" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0 0 L8 4 L0 8 z" fill="#e5484d" />
                </marker>
              </defs>
              {arrows.map((a) => (
                <path key={a.key} d={a.d} fill="none" stroke={a.late ? "#e5484d" : "#8f95b0"} strokeWidth={1.5} strokeLinejoin="round" markerEnd={`url(#${a.late ? "dep-arrow-late" : "dep-arrow"})`} />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ height, left, children, width, todayX, quarterXs, gridBg, gridOffset, tint }: {
  quarterXs: number[]; height: number; left: React.ReactNode; children?: React.ReactNode; width: number; todayX: number; gridBg?: string; gridOffset: number; tint?: boolean;
}) {
  return (
    <div className="flex border-b border-ink-100" style={{ height }}>
      <div className={clsx("sticky left-0 z-20 flex shrink-0 items-center border-r border-ink-200/70", tint ? "bg-ink-50" : "bg-white")} style={{ width: LEFT }}>{left}</div>
      <div className={clsx("relative", tint && "bg-ink-50/50")} style={{ width, backgroundImage: gridBg, backgroundPositionX: gridOffset }}>
        {quarterXs.map((qx) => <div key={qx} className="absolute inset-y-0 w-px bg-ink-300/80" style={{ left: qx }} />)}
        <div className="absolute inset-y-0 z-[1] w-px bg-orange-400/70" style={{ left: todayX }} />
        {children}
      </div>
    </div>
  );
}

function Bar({ p, c, x, px, onOpen }: { p: Project; c: { base: string; fill: string; text: string }; x: (d: Date) => number; px: number; onOpen: (p: Project) => void }) {
  const s = parseDate(p.start);
  const e = parseDate(p.due);
  const r = parseDate(p.release);
  const start = s ?? e;
  const end = e ?? s;

  if (!start || !end)
    return r ? <Release x={x(r) + px / 2} date={p.release} /> : <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs italic text-ink-300">No dates yet</span>;

  const left = x(start);
  const w = Math.max(px, x(end) - left + px);
  const status = statusOf(p);
  const labelInside = w > 120;

  return (
    <>
      {r && differenceInCalendarDays(r, end) > 0 && <div className="absolute top-1/2 z-[2] h-px border-t border-dashed border-emerald-500/60" style={{ left: left + w, width: x(r) + px / 2 - (left + w) }} />}
      {r && <Release x={x(r) + px / 2} date={p.release} />}

      <button
        onClick={() => onOpen(p)}
        title={`${p.name}${assigneesOf(p).length ? ` (${assigneesOf(p).join(", ")})` : ""}\n${fmt(p.start) || "?"} → ${fmt(p.due) || "?"}${p.release ? `\nRelease ${fmt(p.release)}` : ""}\n${p.progress}% · ${status}`}
        className="group/bar absolute top-1/2 z-[3] h-7 -translate-y-1/2 overflow-hidden rounded-full text-left shadow-sm ring-1 ring-black/5 transition hover:shadow-md hover:ring-2"
        style={{ left, width: w, background: c.base, ["--tw-ring-color" as string]: c.fill }}
      >
        {/* label is drawn twice: dark over the remaining track, white clipped to the filled part */}
        {labelInside && <BarLabel p={p} color={c.text} />}
        <span className="absolute inset-y-0 left-0 overflow-hidden rounded-full" style={{ width: `${p.progress}%`, background: c.fill }}>
          {labelInside && <span className="absolute inset-y-0 left-0 block" style={{ width: w }}><BarLabel p={p} color="#fff" /></span>}
        </span>
      </button>

      {!labelInside && (
        <span className="absolute top-1/2 z-[3] -translate-y-1/2 whitespace-nowrap pl-2 text-[11px] font-medium text-ink-500" style={{ left: left + w }}>
          {p.name} · {p.progress}%
        </span>
      )}
    </>
  );
}

function BarLabel({ p, color }: { p: Project; color: string }) {
  return (
    <span className="absolute inset-0 flex items-center justify-between gap-2 px-3 text-[11px] font-semibold" style={{ color }}>
      <span className="truncate">{p.name}</span>
      <span className="shrink-0">{p.progress}%</span>
    </span>
  );
}

function Release({ x, date }: { x: number; date: string }) {
  return (
    <span className="absolute top-1/2 z-[4] -translate-x-1/2 -translate-y-1/2" style={{ left: x }} title={`Release ${fmt(date)}`}>
      <Diamond className="h-4 w-4 fill-emerald-500 text-white drop-shadow" strokeWidth={2.5} />
    </span>
  );
}
