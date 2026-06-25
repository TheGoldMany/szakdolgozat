"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Megosztandó útvonal (pl. "/animals/buksi") vagy teljes URL. */
  url: string;
  /** Megosztáshoz használt cím / szöveg. */
  title?: string;
  /** Megjelenés: ikon-only gomb vagy szöveges gomb. */
  variant?: "icon" | "button";
  className?: string;
}

export function ShareButton({ url, title = "ÁllatiMenhelyek.hu", variant = "icon", className }: ShareButtonProps) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Abszolút URL összeállítása (a böngészőben az origin alapján).
  const absoluteUrl = url.startsWith("http")
    ? url
    : (typeof window !== "undefined" ? `${window.location.origin}${url}` : url);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleClick() {
    // Mobilon a natív megosztó lap, ha elérhető.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: absoluteUrl });
        return;
      } catch {
        /* a felhasználó megszakította – nyissuk a saját menüt */
      }
    }
    setOpen((v) => !v);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success("Link a vágólapra másolva");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nem sikerült másolni");
    }
    setOpen(false);
  }

  const enc = encodeURIComponent(absoluteUrl);
  const encT = encodeURIComponent(title);
  const targets = [
    { label: "Facebook", Icon: Facebook,      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "X (Twitter)", Icon: Share2,     href: `https://twitter.com/intent/tweet?url=${enc}&text=${encT}` },
    { label: "WhatsApp", Icon: MessageCircle, href: `https://wa.me/?text=${encT}%20${enc}` },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Megosztás"
        className={cn(
          variant === "icon"
            ? "flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-700"
            : "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50",
          className
        )}
      >
        <Share2 className="h-4 w-4" />
        {variant === "button" && "Megosztás"}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
          {targets.map(({ label, Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon className="h-4 w-4 text-gray-500" />
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Link2 className="h-4 w-4 text-gray-500" />}
            {copied ? "Másolva" : "Link másolása"}
          </button>
        </div>
      )}
    </div>
  );
}
