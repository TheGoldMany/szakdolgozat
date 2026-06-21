import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ExportType = "animals" | "applications" | "volunteers" | "sponsorships" | "events" | "subscribers" | "donations";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ];
  return lines.join("\r\n");
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

// GET /api/export?type=animals|applications|volunteers|sponsorships|events|subscribers
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id } });
    if (!admin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    shelterId = admin.shelterId;
  }

  const type = (req.nextUrl.searchParams.get("type") ?? "animals") as ExportType;
  const VALID: ExportType[] = ["animals", "applications", "volunteers", "sponsorships", "events", "subscribers", "donations"];
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: "Érvénytelen típus" }, { status: 400 });
  }

  let rows: Record<string, unknown>[] = [];
  let filename = `export-${type}-${fmtDate(new Date())}.csv`;

  if (type === "animals") {
    const animals = await prisma.animal.findMany({
      where:   shelterId ? { shelterId } : {},
      include: { shelter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    rows = animals.map(a => ({
      id:             a.id,
      neve:           a.name,
      faj:            a.type,
      fajta:          a.breed ?? "",
      kor_honap:      a.age ?? "",
      meret:          a.size ?? "",
      nem:            a.gender ?? "",
      statusz:        a.status,
      menhely:        a.shelter.name,
      oltott:         a.isVaccinated ? "igen" : "nem",
      ivartalanit:    a.isNeutered   ? "igen" : "nem",
      chipelt:        a.isMicrochipped ? "igen" : "nem",
      erkezesi_datum: fmtDate(a.arrivedAt),
      rogzitett:      fmtDate(a.createdAt),
    }));
  }

  if (type === "applications") {
    const apps = await prisma.adoptionApplication.findMany({
      where:   shelterId ? { animal: { shelterId } } : {},
      include: {
        animal: { select: { name: true } },
        user:   { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    rows = apps.map(a => ({
      id:          a.id,
      allat:       a.animal.name,
      kerelmezo:   a.user.name ?? "",
      email:       a.user.email ?? "",
      statusz:     a.status,
      megjegyzes:  a.reviewNotes ?? "",
      beadva:      fmtDate(a.createdAt),
      felulvizsgalva: fmtDate(a.reviewedAt),
    }));
    filename = `export-kerelmek-${fmtDate(new Date())}.csv`;
  }

  if (type === "volunteers") {
    const vols = await prisma.volunteer.findMany({
      where:   shelterId ? { shelterId } : {},
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    rows = vols.map(v => ({
      id:        v.id,
      nev:       v.user.name ?? "",
      email:     v.user.email ?? "",
      statusz:   v.status,
      motivacio: (v.motivation ?? "").replace(/\r?\n/g, " "),
      rogzitett: fmtDate(v.createdAt),
    }));
    filename = `export-onkentesek-${fmtDate(new Date())}.csv`;
  }

  if (type === "sponsorships") {
    const sponsors = await prisma.sponsorship.findMany({
      where:   shelterId ? { animal: { shelterId } } : {},
      include: {
        animal: { select: { name: true } },
        user:   { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    rows = sponsors.map(s => ({
      id:           s.id,
      allat:        s.animal.name,
      tamogato:     s.user?.name ?? "",
      email:        s.user?.email ?? "",
      osszeg_ft:    s.amount,
      statusz:      s.status,
      publikus:     s.isPublic ? "igen" : "nem",
      megjelenitett_nev: s.displayName ?? "",
      kezdete:      fmtDate(s.createdAt),
      lemondva:     fmtDate(s.cancelledAt),
    }));
    filename = `export-virtualis-orokbefogadas-${fmtDate(new Date())}.csv`;
  }

  if (type === "events") {
    const events = await prisma.event.findMany({
      where:   shelterId ? { shelterId } : {},
      include: {
        shelter:       { select: { name: true } },
        _count:        { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { startsAt: "desc" },
    });
    rows = events.map(e => ({
      id:           e.id,
      cim:          e.title,
      tipus:        e.type,
      statusz:      e.status,
      menhely:      e.shelter.name,
      helyszin:     e.location,
      kezdete:      fmtDate(e.startsAt),
      vege:         fmtDate(e.endsAt),
      kapacitas:    e.capacity ?? "korlátlan",
      jelentkezok:  e._count.registrations,
    }));
    filename = `export-esemenyek-${fmtDate(new Date())}.csv`;
  }

  if (type === "subscribers") {
    const subs = await prisma.subscription.findMany({
      where:   shelterId ? { tier: { shelterId } } : {},
      include: {
        user: { select: { name: true, email: true } },
        tier: { select: { name: true, amount: true, shelter: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    rows = subs.map(s => ({
      id:        s.id,
      elofizetett: s.user?.name ?? "",
      email:     s.user?.email ?? "",
      csomag:    s.tier.name,
      menhely:   s.tier.shelter?.name ?? "",
      osszeg_ft: s.tier.amount,
      statusz:   s.status,
      kezdete:   fmtDate(s.createdAt),
      lemondva:  fmtDate(s.cancelledAt),
    }));
    filename = `export-elofizetok-${fmtDate(new Date())}.csv`;
  }

  if (type === "donations") {
    const donations = await prisma.donation.findMany({
      where: shelterId
        ? { paidAt: { not: null }, campaign: { shelterId } }
        : { paidAt: { not: null } },
      include: {
        user:     { select: { name: true, email: true } },
        campaign: { select: { title: true, shelter: { select: { name: true } } } },
      },
      orderBy: { paidAt: "desc" },
    });
    rows = donations.map(d => ({
      id:         d.id,
      adomanyozo: d.isAnonymous ? "Névtelen" : (d.user?.name ?? ""),
      email:      d.isAnonymous ? "" : (d.user?.email ?? ""),
      osszeg_ft:  d.amount,
      kampany:    d.campaign?.title ?? "",
      menhely:    d.campaign?.shelter?.name ?? "",
      uzenet:     (d.message ?? "").replace(/\r?\n/g, " "),
      nevtelen:   d.isAnonymous ? "igen" : "nem",
      fizetve:    fmtDate(d.paidAt),
    }));
    filename = `export-adomanyok-${fmtDate(new Date())}.csv`;
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
