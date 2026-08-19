"use client";

import { useMemo, useState } from "react";
import { Check, AlertTriangle, XCircle, Search, X, Plus } from "lucide-react";
import {
  analyseSeo, effectiveDescription, effectiveTitle,
  SEO_TITLE_MAX, SEO_DESC_MAX, SEO_DESC_MIN,
  type SeoCheck,
} from "@/lib/seo";

export interface SeoFields {
  seoTitle:        string;
  metaDescription: string;
  focusKeyword:    string;
  keywords:        string[];
  tags:            string[];
}

interface Props {
  value:    SeoFields;
  onChange: (next: SeoFields) => void;
  /** A cikk többi mezője, amiből az elemzés dolgozik. */
  title:    string;
  excerpt:  string;
  content:  string;
  imageUrl: string;
  slug?:    string | null;
  /** A találat-előnézetben megjelenő domain. */
  siteUrl?: string;
}

const STATUS_ICON = {
  ok:   Check,
  warn: AlertTriangle,
  bad:  XCircle,
} as const;

const STATUS_STYLE = {
  ok:   "text-green-600",
  warn: "text-amber-600",
  bad:  "text-red-600",
} as const;

/** Karakterszámláló: a határ átlépésekor színnel jelez. */
function Counter({ value, max, min }: { value: number; max: number; min?: number }) {
  const tooLong  = value > max;
  const tooShort = min !== undefined && value > 0 && value < min;
  return (
    <span className={
      tooLong ? "text-red-600" : tooShort ? "text-amber-600" : "text-gray-400"
    }>
      {value}/{max}
    </span>
  );
}

/** Szabadon bővíthető címkelista (kulcsszavak, címszavak). */
function TermInput({
  label, hint, values, onChange, placeholder,
}: {
  label: string; hint: string; values: string[];
  onChange: (next: string[]) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim().replace(/\s+/g, " ");
    if (!value) return;
    // Ékezet- és kisbetű-független duplikátumszűrés
    const exists = values.some(
      (v) => v.localeCompare(value, "hu", { sensitivity: "base" }) === 0
    );
    if (!exists) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter ne küldje be a cikk-űrlapot, csak a címkét adja hozzá
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl border border-gray-200 px-2.5 text-gray-500 transition-colors hover:bg-gray-50"
          aria-label={label}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                {v}
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] leading-snug text-gray-400">{hint}</p>
    </div>
  );
}

/**
 * A cikkszerkesztő keresőoptimalizálási panelje.
 *
 * Nemcsak mezőket ad, hanem visszajelzést is: megmutatja, hogyan fog kinézni a
 * találat a Google-ben, és felsorolja, min érdemes még javítani. A puszta
 * kulcsszómezők önmagukban nem javítanak a helyezésen – ez az ellenőrzőlista
 * az, ami ténylegesen jobb tartalmat eredményez.
 */
export function ArticleSeoPanel({
  value, onChange, title, excerpt, content, imageUrl, slug, siteUrl = "allatimenhelyek.hu",
}: Props) {
  const set = <K extends keyof SeoFields>(key: K, v: SeoFields[K]) =>
    onChange({ ...value, [key]: v });

  const previewTitle = effectiveTitle({ title, seoTitle: value.seoTitle });
  const previewDesc  = effectiveDescription({
    metaDescription: value.metaDescription, excerpt, content,
  });

  const checks: SeoCheck[] = useMemo(
    () => analyseSeo({
      title, seoTitle: value.seoTitle, metaDescription: value.metaDescription,
      excerpt, content, focusKeyword: value.focusKeyword, slug,
      imageUrl, tags: value.tags,
    }),
    [title, value.seoTitle, value.metaDescription, excerpt, content, value.focusKeyword, slug, imageUrl, value.tags]
  );

  const todo = checks.filter((c) => c.status !== "ok");

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Search className="h-4 w-4 text-brand-500" />
        <h2 className="text-sm font-bold text-gray-900">Keresőoptimalizálás</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-gray-500">
        Ezek határozzák meg, hogyan jelenik meg a cikk a Google találati listájában.
        Üresen hagyva a cím és a bevezető szolgál tartalékként.
      </p>

      {/* Találat-előnézet */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Így néz ki a keresőben
        </p>
        <p className="text-xs text-gray-500">
          {siteUrl} › cikkek › {slug ?? "…"}
        </p>
        <p className="mt-0.5 truncate text-base font-medium text-blue-700">
          {previewTitle || "A cikk címe"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600">
          {previewDesc || "A találat alatt megjelenő leírás."}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <label className="font-medium text-gray-600">Keresőcím</label>
            <Counter value={previewTitle.length} max={SEO_TITLE_MAX} />
          </div>
          <input
            type="text"
            value={value.seoTitle}
            placeholder={title || "Üresen a cikk címe jelenik meg"}
            onChange={(e) => set("seoTitle", e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <label className="font-medium text-gray-600">Meta leírás</label>
            <Counter value={previewDesc.length} max={SEO_DESC_MAX} min={SEO_DESC_MIN} />
          </div>
          <textarea
            rows={3}
            value={value.metaDescription}
            placeholder="Egy-két mondat arról, miről szól a cikk – ez jelenik meg a találat alatt."
            onChange={(e) => set("metaDescription", e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Fő kulcsszó</label>
          <input
            type="text"
            value={value.focusKeyword}
            placeholder="pl. kutya örökbefogadás"
            onChange={(e) => set("focusKeyword", e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
          />
          <p className="mt-1 text-[11px] leading-snug text-gray-400">
            Amire keresve meg kellene találni a cikket. Ez alapján készül az alábbi ellenőrzőlista.
          </p>
        </div>

        <TermInput
          label="Kulcsszavak"
          placeholder="Enter vagy vessző a hozzáadáshoz"
          hint="További kifejezések, amikre a cikk válaszol. A Google metaadatként nem használja – nálunk a kapcsolódó tartalom épül rá."
          values={value.keywords}
          onChange={(v) => set("keywords", v)}
        />

        <TermInput
          label="Címszavak"
          placeholder="pl. örökbefogadás, egészség"
          hint="Nyilvánosan is látszanak, és saját gyűjtőoldaluk van – ez valódi belső hivatkozást ad a cikknek."
          values={value.tags}
          onChange={(v) => set("tags", v)}
        />
      </div>

      {/* Ellenőrzőlista */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-semibold text-gray-700">
          {todo.length === 0
            ? "Minden rendben – a cikk keresőre kész."
            : `Még javítható (${todo.length})`}
        </p>
        <ul className="space-y-1.5">
          {checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <li key={check.id} className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${STATUS_STYLE[check.status]}`} />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-700">{check.label}</span>
                  {check.hint && (
                    <p className="text-[11px] leading-snug text-gray-400">{check.hint}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
