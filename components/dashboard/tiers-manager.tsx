"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pencil, X, Check, Info } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  isActive: boolean;
  _count: { subscriptions: number };
}

interface TiersManagerProps {
  tiers: Tier[];
  shelterId: string;
  /** A platformszinten rögzített csomagösszegek – csak tájékoztatásra. */
  allowedAmounts: readonly number[];
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

interface TierForm {
  name: string;
  description: string;
}

const emptyForm: TierForm = { name: "", description: "" };

/**
 * Támogatói csomagok kezelése.
 *
 * Az ÖSSZEGEK platformszinten rögzítettek (lásd lib/donation-tiers.ts), és a
 * négy csomag automatikusan létrejön minden menhelyhez – ezért itt nincs
 * létrehozás, törlés és összeg-szerkesztés. A menhely a NEVET és a LEÍRÁST
 * szabja magára: a csomag értékét a történet adja, nem a szám.
 *
 * A régi, egyedi összegű csomagok inaktívan megmaradnak, mert a rájuk
 * előfizetők a Stripe-nál a belépéskori árat fizetik tovább.
 */
export function TiersManager({ tiers: initialTiers, shelterId, allowedAmounts }: TiersManagerProps) {
  const t = useTranslations("dashboard");
  const [tiers, setTiers]         = useState<Tier[]>(initialTiers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<TierForm>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function startEdit(tier: Tier) {
    setEditingId(tier.id);
    setEditForm({ name: tier.name, description: tier.description ?? "" });
    setError(null);
  }

  async function handleEdit(e: React.FormEvent, tierId: string) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setError(t("tiersValidationError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers/${tierId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        editForm.name.trim(),
          description: editForm.description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("tiersUnknownError"));
      const updated: Tier = await res.json();
      setTiers((prev) => prev.map((x) => (x.id === tierId ? { ...x, ...updated } : x)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tiersUnknownError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(tier: Tier) {
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers/${tier.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !tier.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated: Tier = await res.json();
      setTiers((prev) => prev.map((x) => (x.id === tier.id ? { ...x, ...updated } : x)));
    } catch {
      setError(t("tiersToggleFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <p className="text-xs leading-relaxed text-gray-500">
          {t("tiersFixedAmountsInfo", {
            amounts: allowedAmounts.map((a) => formatHUF(a)).join(" · "),
          })}
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {tiers.length === 0 && (
        <p className="text-sm text-gray-500">{t("tiersNoTiers")}</p>
      )}

      <div className="space-y-3">
        {tiers.map((tier) =>
          editingId === tier.id ? (
            <form
              key={tier.id}
              onSubmit={(e) => handleEdit(e, tier.id)}
              className="rounded-2xl border border-brand-200 bg-brand-50 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t("tiersEdit")}</p>
                <span className="text-sm font-bold text-brand-600">
                  {formatHUF(tier.amount)} {t("tiersPerMonth")}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t("tiersNameLabel")}</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{t("tiersDescriptionLabel")}</label>
                  <input
                    type="text"
                    placeholder={t("tiersDescriptionPlaceholder")}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={saving} size="sm">
                  <Check className="h-3.5 w-3.5" /> {t("tiersSave")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" /> {t("tiersCancel")}
                </Button>
              </div>
            </form>
          ) : (
            <div
              key={tier.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{tier.name}</p>
                  <span className="text-sm font-bold text-brand-600">
                    {formatHUF(tier.amount)} {t("tiersPerMonth")}
                  </span>
                  {!tier.isActive && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {t("tiersInactive")}
                    </span>
                  )}
                  {!allowedAmounts.includes(tier.amount) && (
                    <span
                      className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                      title={t("tiersLegacyHint")}
                    >
                      {t("tiersLegacy")}
                    </span>
                  )}
                </div>
                {tier.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{tier.description}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {t("tiersSubscribersCount", { count: tier._count.subscriptions })}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(tier)}
                  title={tier.isActive ? t("tiersDeactivate") : t("tiersActivate")}
                  className={[
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    tier.isActive
                      ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                  ].join(" ")}
                >
                  {tier.isActive ? t("tiersActive") : t("tiersInactive")}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(tier)}
                  title={t("tiersEdit")}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
