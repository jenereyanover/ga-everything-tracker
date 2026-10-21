import type { AppUser } from "@/lib/types";
import Avatar from "./Avatar";

const MAX = 5;

/** Stacked avatars of everyone currently viewing; you come first. */
export default function Viewers({ viewers, meUid }: { viewers: AppUser[]; meUid: string }) {
  if (!viewers.length) return null;
  const sorted = [...viewers].sort((a, b) => (a.uid === meUid ? -1 : b.uid === meUid ? 1 : a.name.localeCompare(b.name)));
  const shown = sorted.slice(0, MAX);
  const extra = sorted.length - shown.length;
  return (
    <div className="flex items-center" aria-label={`${viewers.length} viewing now`}>
      <div className="flex -space-x-2">
        {shown.map((v) => (
          <span key={v.uid} title={v.uid === meUid ? `${v.name} (you)` : v.name} className="relative rounded-full ring-2 ring-white">
            <Avatar user={v} size={30} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        ))}
        {extra > 0 && (
          <span title={sorted.slice(MAX).map((v) => v.name).join(", ")} className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-500 ring-2 ring-white">+{extra}</span>
        )}
      </div>
      <span className="ml-2.5 hidden text-xs text-ink-400 lg:inline">{viewers.length === 1 ? "Just you" : `${viewers.length} viewing`}</span>
    </div>
  );
}
