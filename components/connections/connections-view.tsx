"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Users, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ConnectButton, type ConnectionStateName } from "@/components/connections/connect-button";

interface Person {
  id:    string;
  name:  string | null;
  image: string | null;
  city:  string | null;
}
interface Hit extends Person {
  connection: { state: ConnectionStateName; id: string | null };
}
interface Lists {
  accepted: (Person & { connectionId: string })[];
  incoming: (Person & { connectionId: string })[];
  outgoing: (Person & { connectionId: string })[];
}

/** Egy ember egy sorban: arckép, név, város, és jobbra a művelet. */
function PersonRow({
  person, children,
}: { person: Person; children: React.ReactNode }) {
  const t = useTranslations("connections");
  return (
    <li className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
      <Link
        href={`/users/${person.id}`}
        aria-label={t("viewProfile")}
        className="press-card flex min-w-0 flex-1 items-center gap-3"
      >
        {person.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.image}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
            {person.name?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {person.name ?? "—"}
          </span>
          {person.city && (
            <span className="block truncate text-xs text-gray-400">{person.city}</span>
          )}
        </span>
      </Link>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

function Section({
  title, count, empty, children,
}: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <h2 className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
        {title}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {count}
        </span>
      </h2>
      {count === 0
        ? <p className="px-4 py-8 text-center text-sm text-gray-400">{empty}</p>
        : <ul className="stagger">{children}</ul>}
    </section>
  );
}

export function ConnectionsView() {
  const t = useTranslations("connections");

  const [query,  setQuery]  = useState("");
  const [hits,   setHits]   = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [lists,  setLists]  = useState<Lists | null>(null);

  const reloadLists = useCallback(async () => {
    try {
      const res = await fetch("/api/connections");
      if (res.ok) setLists(await res.json());
    } catch { /* a lista hibája ne dobja szét az oldalt */ }
  }, []);

  useEffect(() => { reloadLists(); }, [reloadLists]);

  /**
   * Késleltetett keresés.
   *
   * Gépelés közben minden leütésre nem kérdezünk rá: 300 ms szünet után
   * indul a kérés, és a korábbi válaszokat eldobjuk. Enélkül a lassabb, régebbi
   * válasz felülírhatná a frissebbet, és a lista nem ahhoz tartozna, ami a
   * keresőben áll.
   */
  const runId = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits(null); setSearching(false); return; }

    const mine = ++runId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const json = await res.json().catch(() => ({ results: [] }));
        if (mine !== runId.current) return;   // elavult válasz
        setHits(res.ok ? (json.results ?? []) : []);
      } catch {
        if (mine === runId.current) setHits([]);
      } finally {
        if (mine === runId.current) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const short = query.trim().length > 0 && query.trim().length < 2;

  return (
    <div className="space-y-6">
      {/* Kereső */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="user-search" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("searchLabel")}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-gray-200 pl-9 pr-9 py-2 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <p className={cn("mt-1.5 text-xs", short ? "text-amber-600" : "text-gray-400")}>
          {t("searchHint")}
        </p>
      </div>

      {/* Találatok – csak ha van mit mutatni */}
      {hits !== null && (
        <Section title={t("searchResults")} count={hits.length} empty={t("noResults")}>
          {hits.map((hit) => (
            <PersonRow key={hit.id} person={hit}>
              <ConnectButton
                userId={hit.id}
                initialState={hit.connection.state}
                initialConnectionId={hit.connection.id}
                size="sm"
                onChanged={reloadLists}
              />
            </PersonRow>
          ))}
        </Section>
      )}

      {/* Rád vár – ez a legfontosabb, ezért elöl */}
      <Section
        title={t("tabIncoming")}
        count={lists?.incoming.length ?? 0}
        empty={t("emptyIncoming")}
      >
        {lists?.incoming.map((p) => (
          <PersonRow key={p.connectionId} person={p}>
            <ConnectButton
              userId={p.id} initialState="incoming"
              initialConnectionId={p.connectionId} size="sm" onChanged={reloadLists}
            />
          </PersonRow>
        ))}
      </Section>

      <Section
        title={t("tabAccepted")}
        count={lists?.accepted.length ?? 0}
        empty={t("emptyAccepted")}
      >
        {lists?.accepted.map((p) => (
          <PersonRow key={p.connectionId} person={p}>
            <ConnectButton
              userId={p.id} initialState="connected"
              initialConnectionId={p.connectionId} size="sm" onChanged={reloadLists}
            />
          </PersonRow>
        ))}
      </Section>

      <Section
        title={t("tabOutgoing")}
        count={lists?.outgoing.length ?? 0}
        empty={t("emptyOutgoing")}
      >
        {lists?.outgoing.map((p) => (
          <PersonRow key={p.connectionId} person={p}>
            <ConnectButton
              userId={p.id} initialState="outgoing"
              initialConnectionId={p.connectionId} size="sm" onChanged={reloadLists}
            />
          </PersonRow>
        ))}
      </Section>

      {lists === null && (
        <p className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          {t("searching")}
        </p>
      )}
    </div>
  );
}
