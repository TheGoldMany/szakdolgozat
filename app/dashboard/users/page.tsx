"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageInfo } from "@/components/dashboard/page-info";
import { useTranslations } from "next-intl";

interface User {
  id:            string;
  name:          string | null;
  email:         string;
  role:          string;
  emailVerified: string | null;
  createdAt:     string;
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

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const meta = ROLE_META[user.role] ?? ROLE_META.USER;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                          {((user.name ?? user.email)[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name ?? <span className="text-gray-400">–</span>}</p>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
