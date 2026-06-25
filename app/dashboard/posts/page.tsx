import { redirect } from "next/navigation";
import { MessagesSquare, Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timeAgo } from "@/lib/utils";
import { PostComposer } from "@/components/dashboard/post-composer";
import { DeletePostButton } from "@/components/dashboard/delete-post-button";

export const metadata: Metadata = { title: "Posztok" };
export const dynamic = "force-dynamic";

export default async function DashboardPostsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  let shelterIds: string[];
  if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map((s) => s.id);
  } else {
    const admins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id }, select: { shelterId: true },
    });
    shelterIds = admins.map((a) => a.shelterId);
    if (shelterIds.length === 0) redirect("/dashboard");
  }

  const shelterId = shelterIds[0];

  const [animals, events, campaigns, posts] = await Promise.all([
    prisma.animal.findMany({
      where: { shelterId, status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.event.findMany({
      where: { shelterId, status: "PUBLISHED" },
      orderBy: { startsAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.campaign.findMany({
      where: { shelterId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.post.findMany({
      where: { shelterId: { in: shelterIds } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { likes: true } }, shelter: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <MessagesSquare className="h-6 w-6 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posztok</h1>
          <p className="text-sm text-gray-500">Oszd meg a híreidet a „Neked" feeden – {posts.length} poszt eddig</p>
        </div>
      </div>

      <PostComposer
        shelterId={shelterId}
        animals={animals.map((a) => ({ id: a.id, label: a.name }))}
        events={events.map((e) => ({ id: e.id, label: e.title }))}
        campaigns={campaigns.map((c) => ({ id: c.id, label: c.title }))}
      />

      <div className="mt-6 space-y-3">
        {posts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Még nincs posztod. Írd meg az elsőt fent!
          </p>
        )}
        {posts.map((p) => (
          <div key={p.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-300">
                <ImageIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-gray-800">{p.content}</p>
              <p className="mt-1 text-xs text-gray-400">
                {timeAgo(p.createdAt)} · {p._count.likes} kedvelés
                {session.user.role === "SUPER_ADMIN" && ` · ${p.shelter.name}`}
              </p>
            </div>
            <DeletePostButton postId={p.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
