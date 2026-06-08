"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightLeft, CheckCircle, XCircle, Undo2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type TransferStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface TransferEntry {
  id:            string;
  status:        TransferStatus;
  note:          string | null;
  requestedAt:   string;
  resolvedAt:    string | null;
  animal:        { id: string; name: string; slug: string; type: string; images: { url: string }[] };
  fromShelter:   { id: string; name: string };
  toShelter:     { id: string; name: string };
  requestedBy:   { name: string | null };
  resolvedBy:    { name: string | null } | null;
}

const STATUS_LABELS: Record<TransferStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: "Várakozó",    color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED:  { label: "Jóváhagyva", color: "bg-green-100 text-green-700",  icon: CheckCircle },
  REJECTED:  { label: "Elutasítva", color: "bg-red-100 text-red-700",      icon: XCircle },
  CANCELLED: { label: "Visszavont", color: "bg-gray-100 text-gray-500",    icon: Undo2 },
};

interface Props {
  initialTransfers: TransferEntry[];
  currentShelterId: string;
}

export function TransfersManager({ initialTransfers, currentShelterId }: Props) {
  const [transfers, setTransfers] = useState<TransferEntry[]>(initialTransfers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  async function resolve(transfer: TransferEntry, action: "APPROVED" | "REJECTED" | "CANCELLED") {
    setLoading(transfer.id + action);
    try {
      const res = await fetch(`/api/animals/${transfer.animal.id}/transfer/${transfer.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, note: noteInputs[transfer.id] || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Hiba történt");
        return;
      }
      // Refresh from server
      const allRes = await fetch("/api/transfers");
      if (allRes.ok) setTransfers(await allRes.json());
    } catch {
      alert("Hálózati hiba.");
    } finally {
      setLoading(null);
    }
  }

  const pending  = transfers.filter(t => t.status === "PENDING");
  const resolved = transfers.filter(t => t.status !== "PENDING");

  return (
    <div className="space-y-6">
      {/* Pending */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-700">
          Várakozó kérelmek ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            Nincs várakozó áthelyezési kérelem.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(t => (
              <TransferCard
                key={t.id}
                transfer={t}
                currentShelterId={currentShelterId}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                noteInputs={noteInputs}
                setNoteInputs={setNoteInputs}
                loading={loading}
                resolve={resolve}
              />
            ))}
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-700">
            Lezárt kérelmek ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map(t => (
              <TransferCard
                key={t.id}
                transfer={t}
                currentShelterId={currentShelterId}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                noteInputs={noteInputs}
                setNoteInputs={setNoteInputs}
                loading={loading}
                resolve={resolve}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TransferCard({
  transfer: t, currentShelterId, expandedId, setExpandedId,
  noteInputs, setNoteInputs, loading, resolve,
}: {
  transfer:         TransferEntry;
  currentShelterId: string;
  expandedId:       string | null;
  setExpandedId:    (id: string | null) => void;
  noteInputs:       Record<string, string>;
  setNoteInputs:    (v: Record<string, string>) => void;
  loading:          string | null;
  resolve:          (t: TransferEntry, action: "APPROVED" | "REJECTED" | "CANCELLED") => void;
}) {
  const { label, color, icon: Icon } = STATUS_LABELS[t.status];
  const expanded    = expandedId === t.id;
  const isIncoming  = t.toShelter.id === currentShelterId;
  const isOutgoing  = t.fromShelter.id === currentShelterId;
  const thumb       = t.animal.images[0]?.url;
  const isPending   = t.status === "PENDING";
  const isLoading   = (a: string) => loading === t.id + a;

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", expanded && "ring-2 ring-brand-300")}>
      <button
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={() => setExpandedId(expanded ? null : t.id)}
      >
        {thumb ? (
          <Image src={thumb} alt={t.animal.name} width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">🐾</div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/animals`}
              className="font-semibold text-gray-900 hover:text-brand-600 truncate"
              onClick={e => e.stopPropagation()}
            >
              {t.animal.name}
            </Link>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", color)}>
              <Icon className="inline h-3 w-3 mr-1" />{label}
            </span>
            {isIncoming && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Bejövő
              </span>
            )}
            {isOutgoing && (
              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Kimenő
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
            {t.fromShelter.name}
            <ArrowRightLeft className="h-3 w-3 shrink-0" />
            {t.toShelter.name}
          </p>
        </div>

        <div className="shrink-0 text-xs text-gray-400">
          {new Date(t.requestedAt).toLocaleDateString("hu-HU")}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Kérelmező:</span>{" "}
              <span className="font-medium text-gray-900">{t.requestedBy.name ?? "—"}</span>
            </div>
            {t.resolvedBy && (
              <div>
                <span className="text-gray-500">Döntött:</span>{" "}
                <span className="font-medium text-gray-900">{t.resolvedBy.name ?? "—"}</span>
              </div>
            )}
            {t.resolvedAt && (
              <div>
                <span className="text-gray-500">Lezárva:</span>{" "}
                <span className="font-medium text-gray-900">
                  {new Date(t.resolvedAt).toLocaleDateString("hu-HU")}
                </span>
              </div>
            )}
          </div>

          {t.note && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <strong className="block mb-1 text-gray-500">Megjegyzés:</strong>
              {t.note}
            </div>
          )}

          {isPending && (
            <div className="space-y-2 pt-1">
              <textarea
                value={noteInputs[t.id] ?? ""}
                onChange={e => setNoteInputs({ ...noteInputs, [t.id]: e.target.value })}
                rows={2}
                placeholder="Döntési megjegyzés (opcionális)…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-2">
                {isIncoming && (
                  <>
                    <button
                      onClick={() => resolve(t, "APPROVED")}
                      disabled={!!isLoading("APPROVED")}
                      className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading("APPROVED") ? "…" : "✓ Jóváhagyás"}
                    </button>
                    <button
                      onClick={() => resolve(t, "REJECTED")}
                      disabled={!!isLoading("REJECTED")}
                      className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isLoading("REJECTED") ? "…" : "✗ Elutasítás"}
                    </button>
                  </>
                )}
                {isOutgoing && (
                  <button
                    onClick={() => resolve(t, "CANCELLED")}
                    disabled={!!isLoading("CANCELLED")}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isLoading("CANCELLED") ? "…" : "Visszavonás"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
