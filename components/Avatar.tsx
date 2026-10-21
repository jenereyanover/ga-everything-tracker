import type { AppUser } from "@/lib/types";

export default function Avatar({ user, size = 32 }: { user: Pick<AppUser, "name" | "photo">; size?: number }) {
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return user.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.photo} alt="" referrerPolicy="no-referrer" style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-blue-500 font-semibold text-white"
    >
      {initials}
    </span>
  );
}
