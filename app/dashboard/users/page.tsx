"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight, Loader2, Ban, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageInfo } from "@/components/dashboard/page-info";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface User {
  id:            string;
  name:          string | null;
  email:         string;
  role:          string;
  emailVerified: string | null;
  createdAt:     string;
  suspendedAt:   string | null;
  _count:        { applications: number; shelterAdmins: number };
}

export default function DashboardUsersPage() {
  const t = useTranslations("dashboard");

  const ROLE_META: Record<string, { label: string; color: string }> = {
    USER:          { label: t("usersRoleUser"),       color: "bg-gray-100 text-gray-600"    },
    SHELTER_ADMIN: { label: t("usersRoleAdmin"),      color: "bg-brand-100 text-brand-700" },
    SUPER_ADMIN:   { label: t("usersRoleSuperAdmin"), color: "bg-red-100 text-red-700"      },
  };

  const [users,      setUsers]      = useState<User[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busy,       setBusy]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search)     params.set("search", search);
    if (roleFilter) params.set("role",   roleFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: updated.role } : u));
      }
    } finally {
      setBusy(null);
    }
  };

  const toggleSuspend = async (userId: string, suspend: boolean) => {
    setBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ suspended: suspend }),
      });
      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, suspendedAt: json.suspendedAt ?? null } : u));
        toast.success(suspend ? "Felhasználó felfüggesztve." : "Felhasználó visszaaktiválva.");
      } else {
        toast.error(json.error ?? "Hiba történt.");
      }
    } finally {
      setBusy(null);
    }
  };

  const deleteUser = async (user: User) => {
    setConfirmDelete(null);
    setBusy(user.id);
    try {
      const res  = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setTotal((t) => t - 1);
        toast.success("Felhasználó törölve.");
      } else {
        toast.error(json.error ?? "A törlés sikertelen.");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-brand-500" />
        <h1 className="text-xl font-bold text-gray-900">
          {t("usersPageTitle")}
          <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
        </h1>
        <PageInfo page="users" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("usersSearchPlaceholder")}
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">{t("usersAllRoles")}</option>
          <option value="USER">{t("usersRoleUser")}</option>
          <option value="SHELTER_ADMIN">{t("usersRoleAdmin")}</option>
          <option value="SUPER_ADMIN">{t("usersRoleSuperAdmin")}</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Users className="mx-auto mb-3 h-8 w-8 text-gray-200" />
            <p>{t("usersNoResults")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">{t("usersColUser")}</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">{t("usersColEmail")}</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">{t("usersColApplications")}</th>
                <th className="px-4 py-3 text-left">{t("usersColRole")}</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">{t("usersColRegistered")}</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const meta = ROLE_META[user.role] ?? ROLE_META.USER;
                const isSuspended = !!user.suspendedAt;
                const isSuperAdmin = user.role === "SUPER_ADMIN";
                return (
                  <tr key={user.id} className={cn("transition-colors", isSuspended ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                          {((user.name ?? user.email)[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1.5">
                            {user.name ?? <span className="text-gray-400">–</span>}
                            {isSuspended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                <Ban className="h-2.5 w-2.5" /> Felfüggesztve
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 md:hidden">{user.email}</p>
                          {!user.emailVerified && (
                            <p className="text-[10px] font-medium text-amber-500">{t("usersEmailNotVerified")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{user.email}</td>
                    <td className="hidden px-4 py-3 text-center text-gray-500 sm:table-cell">
                      {user._count.applications}
                    </td>
                    <td className="px-4 py-3">
                      {busy === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user.id, e.target.value)}
                          className={cn(
                            "cursor-pointer rounded-lg border border-transparent px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500",
                            meta.color
                          )}
                        >
                          <option value="USER">{t("usersRoleUser")}</option>
                          <option value="SHELTER_ADMIN">{t("usersRoleAdmin")}</option>
                          <option value="SUPER_ADMIN">{t("usersRoleSuperAdmin")}</option>
                        </select>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-gray-400 lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString("hu-HU")}
                    </td>
                    <td className="px-4 py-3">
                      {isSuperAdmin ? (
                        <span className="block text-right text-xs text-gray-300">–</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuspended ? (
                            <button
                              onClick={() => toggleSuspend(user.id, false)}
                              disabled={busy === user.id}
                              title="Visszaaktiválás"
                              className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              {busy === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              Aktiválás
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleSuspend(user.id, true)}
                              disabled={busy === user.id}
                              title="Felfüggesztés"
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
                            >
                              {busy === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              Felfüggesztés
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDelete(user)}
                            disabled={busy === user.id}
                            title="Törlés"
                            className="inline-flex items-center rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Törlés megerősítő dialógus */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Felhasználó törlése</h2>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              Biztosan véglegesen törlöd a(z) <strong>{confirmDelete.name ?? confirmDelete.email}</strong> felhasználót?
            </p>
            <p className="mb-6 text-xs text-red-600 font-medium">
              Ez a művelet nem visszavonható. A felhasználó adatai véglegesen törlődnek.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t("usersTotalLabel", { count: total })}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="rounded-lg border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
