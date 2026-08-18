"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

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
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

interface TierForm {
  name: string;
  description: string;
  amount: string;
}

const emptyForm: TierForm = { name: "", description: "", amount: "" };

export function TiersManager({ tiers: initialTiers, shelterId }: TiersManagerProps) {
  const t = useTranslations("dashboard");
  const [tiers, setTiers] = useState<Tier[]>(initialTiers);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<TierForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TierForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseInt(newForm.amount, 10);
    if (!newForm.name.trim() || isNaN(amt) || amt < 1) {
      setError(t("tiersValidationError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name.trim(),
          description: newForm.description.trim() || null,
          amount: amt,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("tiersUnknownError"));
      const created: Tier = await res.json();
      setTiers((prev) => [...prev, { ...created, _count: { subscriptions: 0 } }]);
      setNewForm(emptyForm);
      setShowNew(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tiersUnknownError"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(tier: Tier) {
    setEditingId(tier.id);
    setEditForm({ name: tier.name, description: tier.description ?? "", amount: String(tier.amount) });
    setError(null);
  }

  async function handleEdit(e: React.FormEvent, tierId: string) {
    e.preventDefault();
    const amt = parseInt(editForm.amount, 10);
    if (!editForm.name.trim() || isNaN(amt) || amt < 1) {
      setError(t("tiersValidationError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers/${tierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          amount: amt,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("tiersUnknownError"));
      const updated: Tier = await res.json();
      setTiers((prev) =>
        prev.map((t) => (t.id === tierId ? { ...t, ...updated } : t))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tiersUnknownError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tierId: string) {
    if (!confirm(t("tiersDelete") + "?")) return;
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers/${tierId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTiers((prev) => prev.filter((t) => t.id !== tierId));
    } catch {
      setError(t("tiersDeleteFailed"));
    }
  }

  async function handleToggleActive(tier: Tier) {
    try {
      const res = await fetch(`/api/shelters/${shelterId}/tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tier.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated: Tier = await res.json();
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, ...updated } : t)));
    } catch {
      setError(t("tiersToggleFailed"));
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* Tier list */}
      {tiers.length === 0 && !showNew && (
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
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{t("tiersEdit")}</p>
              <TierFormFields form={editForm} onChange={setEditForm} t={t} />
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{tier.name}</p>
                  <span className="text-sm font-bold text-brand-600">{formatHUF(tier.amount)} {t("tiersPerMonth")}</span>
                  {!tier.isActive && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {t("tiersInactive")}
                    </span>
                  )}
                </div>
                {tier.description && (
                  <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{tier.description}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">{t("tiersSubscribersCount", { count: tier._count.subscriptions })}</p>
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
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tier.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* New tier form */}
      {showNew ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-brand-200 bg-brand-50 p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{t("tiersNew")}</p>
          <TierFormFields form={newForm} onChange={setNewForm} t={t} />
          <div className="flex gap-2">
            <Button type="submit" loading={saving} size="sm">
              <Check className="h-3.5 w-3.5" /> {t("tiersCreate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowNew(false); setNewForm(emptyForm); setError(null); }}
            >
              <X className="h-3.5 w-3.5" /> {t("tiersCancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setShowNew(true); setError(null); }}
        >
          <Plus className="h-4 w-4" /> {t("tiersNew")}
        </Button>
      )}
    </div>
  );
}

function TierFormFields({
  form,
  onChange,
  t,
}: {
  form: TierForm;
  onChange: (f: TierForm) => void;
  t: ReturnType<typeof useTranslations<"dashboard">>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">{t("tiersNameLabel")}</label>
        <input
          type="text"
          required
          placeholder="pl. Alapcsomag"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">{t("tiersAmountLabel")}</label>
        <input
          type="number"
          required
          min={1}
          placeholder="pl. 1000"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div className="sm:col-span-1">
        <label className="mb-1 block text-xs font-medium text-gray-600">{t("tiersDescriptionLabel")}</label>
        <input
          type="text"
          placeholder={t("tiersDescriptionPlaceholder")}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
    </div>
  );
}
