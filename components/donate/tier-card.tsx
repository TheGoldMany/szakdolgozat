"use client";

import { useState } from "react";
import { Users, X, Copy, CheckCheck, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShelterPaymentInfo {
  name:              string;
  companyName:       string | null;
  bankAccountName:   string | null;
  bankAccountNumber: string | null;
}

interface TierCardProps {
  tier: {
    id:          string;
    name:        string;
    description: string | null;
    amount:      number;
    _count:      { subscriptions: number };
  };
  shelter: ShelterPaymentInfo;
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors"
      title="Másolás"
    >
      {copied
        ? <CheckCheck className="h-3.5 w-3.5 text-brand-500" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </button>
  );
}

export function TierCard({ tier, shelter }: TierCardProps) {
  const [open, setOpen] = useState(false);

  const hasPaymentInfo = shelter.bankAccountNumber || shelter.bankAccountName;

  const referenceText = `Elofizetés: ${tier.name} – ${shelter.name}`;

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm gap-4 min-w-[220px]">
        <div className="space-y-1">
          <h3 className="font-semibold text-gray-900">{tier.name}</h3>
          <p className="text-2xl font-bold text-brand-600">
            {formatHUF(tier.amount)}
            <span className="text-sm font-normal text-gray-400"> / hó</span>
          </p>
        </div>

        {tier.description && (
          <p className="text-sm text-gray-500 leading-relaxed flex-1">{tier.description}</p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{tier._count.subscriptions} előfizető</span>
        </div>

        <Button onClick={() => setOpen(true)} className="w-full">
          Feliratkozás
        </Button>
      </div>

      {/* Bank transfer modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Banki átutalás</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Utald át a havi összeget az alábbi számlára, és jelezd a megjegyzésben, hogy mire szántad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-brand-50 px-4 py-3 text-center mb-4">
              <p className="text-xs text-brand-600 font-medium">Havi összeg</p>
              <p className="text-2xl font-bold text-brand-700">{formatHUF(tier.amount)}</p>
            </div>

            {hasPaymentInfo ? (
              <dl className="space-y-3">
                {(shelter.companyName || shelter.bankAccountName) && (
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs text-gray-400">Kedvezményezett</dt>
                      <dd className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 break-all">
                          {shelter.companyName || shelter.bankAccountName}
                        </span>
                        <CopyButton text={shelter.companyName || shelter.bankAccountName || ""} />
                      </dd>
                    </div>
                  </div>
                )}

                {shelter.bankAccountNumber && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <dt className="text-xs text-gray-400">Bankszámlaszám</dt>
                      <dd className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-800 break-all">
                          {shelter.bankAccountNumber}
                        </span>
                        <CopyButton text={shelter.bankAccountNumber} />
                      </dd>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs text-gray-400">#</span>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-gray-400">Közlemény (fontos!)</dt>
                    <dd className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 break-all">
                        {referenceText}
                      </span>
                      <CopyButton text={referenceText} />
                    </dd>
                  </div>
                </div>
              </dl>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">
                  A menhely még nem adott meg bankszámla adatokat. Keresd őket közvetlenül!
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-400 text-center">
              Az átutalás megerősítése után a menhely manuálisan aktiválja az előfizetésedet.
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
}
