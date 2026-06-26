"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Image as ImageIcon, PawPrint, HandHeart, CalendarDays } from "lucide-react";

interface PostComposerProps {
  userImage:      string | null;
  userName:       string | null;
  shelterName:    string | null;
  shelterLogoUrl: string | null;
}

const QUICK_ACTIONS = [
  { icon: ImageIcon,    label: "Fotó",    query: "",               color: "text-green-600",  bg: "hover:bg-green-50"  },
  { icon: PawPrint,     label: "Állat",   query: "?attach=animal", color: "text-brand-600",  bg: "hover:bg-brand-50"  },
  { icon: HandHeart,    label: "Gyűjtés", query: "?attach=campaign",color: "text-pink-600",  bg: "hover:bg-pink-50"   },
  { icon: CalendarDays, label: "Esemény", query: "?attach=event",  color: "text-purple-600", bg: "hover:bg-purple-50" },
] as const;

export function PostComposer({ userImage, userName, shelterName, shelterLogoUrl }: PostComposerProps) {
  const avatar = shelterLogoUrl ?? userImage ?? null;
  const label  = shelterName ?? userName ?? "?";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Input row */}
      <div className="flex items-center gap-3 p-4">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-100">
          {avatar
            ? <Image src={avatar} alt={label} fill className="object-cover" sizes="40px" />
            : <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand-600">{label[0]}</span>}
        </div>
        <Link
          href="/dashboard/posts"
          className="flex-1 rounded-full bg-gray-100 px-5 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-200"
        >
          Mi újság a menhelyen?
        </Link>
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center divide-x divide-gray-100 border-t border-gray-100">
        {QUICK_ACTIONS.map(({ icon: Icon, label, query, color, bg }) => (
          <Link
            key={label}
            href={`/dashboard/posts${query}`}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${bg} ${color}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
