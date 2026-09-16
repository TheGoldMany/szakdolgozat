"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus, Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Ugyanazok az állapotnevek, amiket a szerver ad vissza. */
export type ConnectionStateName = "none" | "outgoing" | "incoming" | "connected" | "declined";

interface Props {
  userId: string;
  initialState: ConnectionStateName;
  /** A meglévő kapcsolat azonosítója, ha van – a válaszhoz és a törléshez kell. */
  initialConnectionId?: string | null;
  /** Szűk helyen (listasorban) kisebb gombok kellenek. */
  size?: "sm" | "md";
  onChanged?: () => void;
}

/**
 * Ismerős-jelölés gomb, ami mind az öt állapotot kezeli.
 *
 * A gomb az állapotát magában tartja, hogy egy listában minden sor külön
 * tudjon reagálni anélkül, hogy az egész lista újratöltődne. A szerver a
 * hiteles forrás: ha az elutasítja a műveletet (pl. a másik fél közben már
 * válaszolt), visszaállítjuk a gombot és megmutatjuk az indokot.
 *
 * A `declined` szándékosan ugyanúgy néz ki, mint a `none`: aki elutasított egy
 * jelölést, annak nem kell örökre láthatóvá tenni, hogy megtette — és a
 * jelölés újraindítható.
 */
export function ConnectButton({
  userId, initialState, initialConnectionId = null, size = "md", onChanged,
}: Props) {
  const t = useTranslations("connections");
  const [state, setState]   = useState<ConnectionStateName>(initialState);
  const [connId, setConnId] = useState<string | null>(initialConnectionId);
  const [busy, setBusy]     = useState(false);

  async function send(
    run: () => Promise<Response>,
    onOk: (json: Record<string, unknown>) => void,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const res  = await run();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : t("networkError"));
        return;
      }
      onOk(json);
      onChanged?.();
    } catch {
      toast.error(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    send(
      () => fetch("/api/connections", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      }),
      (json) => {
        setConnId(typeof json.id === "string" ? json.id : null);
        // A másik fél már bejelölt minket: ez a kattintás elfogadás volt.
        if (json.outcome === "accepted") {
          setState("connected");
          toast.success(t("mutualHint"));
        } else if (json.outcome === "already_connected") {
          setState("connected");
        } else {
          setState("outgoing");
        }
      },
    );

  const respond = (action: "accept" | "decline") =>
    send(
      () => fetch(`/api/connections/${connId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      }),
      () => setState(action === "accept" ? "connected" : "declined"),
    );

  const drop = () => {
    if (state === "connected" && !confirm(t("confirmRemove"))) return;
    return send(
      () => fetch(`/api/connections/${connId}`, { method: "DELETE" }),
      () => { setState("none"); setConnId(null); },
    );
  };

  if (state === "connected") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
          <Check className="h-4 w-4" />
          {t("connected")}
        </span>
        <Button variant="ghost" size="sm" onClick={drop} loading={busy}>
          {t("remove")}
        </Button>
      </div>
    );
  }

  if (state === "incoming" && connId) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => respond("accept")} loading={busy}>
          <Check className="h-4 w-4" />
          {t("accept")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => respond("decline")} loading={busy}>
          <X className="h-4 w-4" />
          {t("decline")}
        </Button>
      </div>
    );
  }

  if (state === "outgoing") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {t("pending")}
        </span>
        <Button variant="ghost" size="sm" onClick={drop} loading={busy}>
          {t("cancelRequest")}
        </Button>
      </div>
    );
  }

  return (
    <Button size={size === "sm" ? "sm" : "md"} onClick={connect} loading={busy}>
      <UserPlus className="h-4 w-4" />
      {t("connect")}
    </Button>
  );
}
