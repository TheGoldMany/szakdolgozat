/**
 * Elveszett-talált bejelentések párosítása.
 *
 * Folyamat:
 *  1. Új bejelentés képének elemzése (Claude Vision) → strukturált leíró.
 *  2. Jelöltek előszűrése (ellentétes irány, azonos faj, idő- és térablak).
 *  3. Olcsó attribútum-alapú előpontozás (szín, fajta, méret, hely, idő).
 *  4. A legjobb jelölteknél páronkénti Claude Vision összehasonlítás
 *     (vizuális hasonlóság + emberi nyelvű indoklás).
 *  5. Eredmények tárolása a ReportMatch táblába (kanonikus A=LOST, B=másik).
 *  6. Erős (LIKELY) egyezésnél értesítő email a korábbi bejelentés gazdájának.
 *
 * Az egész hibatűrő: ha a Vision nem elérhető, attribútum-alapú párosítás fut.
 */
import { prisma } from "./prisma";
import { haversineKm, daysBetween } from "./geo";
import {
  analyzeReportImage,
  compareReports,
  isVisionEnabled,
} from "./vision";
import { sendReportMatchEmail } from "./email";
import { createNotification } from "./notifications";
import type { AnimalReport, ReportType, MatchVerdict } from "@prisma/client";

const RADIUS_KM = 50;
const TIME_WINDOW_DAYS = 90;
const MAX_VISION_COMPARISONS = 5;
const PRELIM_THRESHOLD = 0.2; // ennél gyengébb jelölteket eldobunk
const PERSIST_THRESHOLD = 0.35; // ennél a végső pontszámnál tároljuk a találatot

const TYPE_LABEL: Record<ReportType, string> = {
  LOST: "elveszett",
  FOUND: "megtalált",
  STRAY: "kóbor",
};

function counterpartTypes(type: ReportType): ReportType[] {
  return type === "LOST" ? ["FOUND", "STRAY"] : ["LOST"];
}

function normalizeColors(r: AnimalReport): string[] {
  const fromAi = r.aiColors ?? [];
  const fromText = (r.color ?? "")
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter(Boolean);
  return Array.from(new Set([...fromAi.map((c) => c.toLowerCase()), ...fromText]));
}

function colorOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const hits = a.filter((c) =>
    b.some((d) => d === c || d.includes(c) || c.includes(d))
  ).length;
  return hits / Math.max(a.length, b.length);
}

interface PrelimResult {
  score: number;
  distanceKm: number | null;
  daysApart: number;
  sameCity: boolean;
}

function prelimScore(a: AnimalReport, b: AnimalReport): PrelimResult {
  let score = 0;
  let weight = 0;

  // Szín (súly 0.3)
  const ca = normalizeColors(a);
  const cb = normalizeColors(b);
  if (ca.length && cb.length) {
    score += 0.3 * colorOverlap(ca, cb);
    weight += 0.3;
  }

  // Fajta (súly 0.2)
  const ba = (a.aiBreed ?? a.breed ?? "").toLowerCase().trim();
  const bb = (b.aiBreed ?? b.breed ?? "").toLowerCase().trim();
  if (ba && bb) {
    const same = ba === bb || ba.includes(bb) || bb.includes(ba);
    score += 0.2 * (same ? 1 : 0);
    weight += 0.2;
  }

  // Méret (súly 0.15)
  if (a.aiSize && b.aiSize) {
    score += 0.15 * (a.aiSize.toLowerCase() === b.aiSize.toLowerCase() ? 1 : 0);
    weight += 0.15;
  }

  // Hely (súly 0.2)
  let distanceKm: number | null = null;
  const sameCity =
    !!a.city && !!b.city && a.city.trim().toLowerCase() === b.city.trim().toLowerCase();
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    distanceKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
    score += 0.2 * Math.max(0, 1 - distanceKm / RADIUS_KM);
    weight += 0.2;
  } else if (sameCity) {
    score += 0.2 * 0.7;
    weight += 0.2;
  }

  // Idő (súly 0.15)
  const daysApart = daysBetween(a.createdAt, b.createdAt);
  score += 0.15 * Math.max(0, 1 - daysApart / TIME_WINDOW_DAYS);
  weight += 0.15;

  return { score: weight > 0 ? score / weight : 0, distanceKm, daysApart, sameCity };
}

function verdictFromScore(score: number): MatchVerdict {
  if (score >= 0.6) return "LIKELY";
  if (score >= 0.35) return "POSSIBLE";
  return "UNLIKELY";
}

/** Attribútum-alapú indoklások magyarul (a Vision indoklás kiegészítéseként / helyett). */
function attributeReasons(
  lost: AnimalReport,
  other: AnimalReport,
  prelim: PrelimResult
): string[] {
  const reasons: string[] = [];
  const ca = normalizeColors(lost);
  const cb = normalizeColors(other);
  if (ca.length && cb.length && colorOverlap(ca, cb) > 0) {
    reasons.push("Hasonló színek a két bejelentésen");
  }
  const ba = (lost.aiBreed ?? lost.breed ?? "").toLowerCase().trim();
  const bb = (other.aiBreed ?? other.breed ?? "").toLowerCase().trim();
  if (ba && bb && (ba === bb || ba.includes(bb) || bb.includes(ba))) {
    reasons.push("Egyező vagy hasonló fajta");
  }
  if (prelim.distanceKm != null) {
    reasons.push(`A két helyszín kb. ${Math.round(prelim.distanceKm)} km-re van egymástól`);
  } else if (prelim.sameCity) {
    reasons.push(`Ugyanaz a település: ${other.city}`);
  }
  reasons.push(
    prelim.daysApart === 0
      ? "A két bejelentés ugyanazon a napon készült"
      : `A két bejelentés ${prelim.daysApart} nap eltéréssel készült`
  );
  return reasons;
}

/** Egy bejelentés képének elemzése és tárolása, ha még nem történt meg. */
export async function analyzeReportIfNeeded(reportId: string): Promise<void> {
  try {
    const report = await prisma.animalReport.findUnique({ where: { id: reportId } });
    if (!report || report.aiAnalyzed || !report.imageUrl || !isVisionEnabled()) return;

    const desc = await analyzeReportImage(report.imageUrl);
    await prisma.animalReport.update({
      where: { id: reportId },
      data: desc
        ? {
            aiAnalyzed: true,
            aiAnalyzedAt: new Date(),
            aiSpecies: desc.species,
            aiBreed: desc.breed,
            aiColors: desc.colors,
            aiPattern: desc.pattern,
            aiSize: desc.size,
            aiFeatures: desc.features,
            aiHasCollar: desc.hasCollar,
            aiSummary: desc.summary,
          }
        : { aiAnalyzed: true, aiAnalyzedAt: new Date() }, // megjelöljük, hogy próbáltuk
    });
  } catch (err) {
    console.error("analyzeReportIfNeeded error:", err);
  }
}

/**
 * Lefuttatja a párosítást egy (jellemzően frissen létrehozott) bejelentésre.
 * Soha nem dob hibát a hívó felé.
 */
export async function runMatchingForReport(reportId: string): Promise<void> {
  try {
    await analyzeReportIfNeeded(reportId);

    const report = await prisma.animalReport.findUnique({ where: { id: reportId } });
    if (!report || report.status !== "ACTIVE") return;

    const since = new Date(Date.now() - TIME_WINDOW_DAYS * 86_400_000);
    const candidates = await prisma.animalReport.findMany({
      where: {
        id: { not: report.id },
        status: "ACTIVE",
        type: { in: counterpartTypes(report.type) },
        animalType: report.animalType,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Előpontozás + tér/idő szűrés
    const scored = candidates
      .map((c) => ({ candidate: c, prelim: prelimScore(report, c) }))
      .filter(({ prelim }) => {
        const withinGeo =
          prelim.distanceKm == null ? prelim.sameCity : prelim.distanceKm <= RADIUS_KM;
        return withinGeo && prelim.score >= PRELIM_THRESHOLD;
      })
      .sort((x, y) => y.prelim.score - x.prelim.score);

    let visionBudget = MAX_VISION_COMPARISONS;

    for (const { candidate, prelim } of scored) {
      // Kanonikus irány: A = LOST, B = a másik (FOUND/STRAY)
      const lost = report.type === "LOST" ? report : candidate;
      const other = report.type === "LOST" ? candidate : report;

      let finalScore = prelim.score;
      let verdict = verdictFromScore(prelim.score);
      let reasons = attributeReasons(lost, other, prelim);

      // Vizuális összehasonlítás, ha mindkét oldalon van kép és van keret
      if (
        visionBudget > 0 &&
        isVisionEnabled() &&
        lost.imageUrl &&
        other.imageUrl
      ) {
        visionBudget--;
        const cmp = await compareReports(
          {
            label: "Elveszett",
            imageUrl: lost.imageUrl,
            breed: lost.aiBreed ?? lost.breed,
            color: lost.color,
            description: lost.description,
          },
          {
            label: TYPE_LABEL[other.type],
            imageUrl: other.imageUrl,
            breed: other.aiBreed ?? other.breed,
            color: other.color,
            description: other.description,
          }
        );
        if (cmp) {
          finalScore = 0.6 * cmp.visualScore + 0.4 * prelim.score;
          verdict = cmp.verdict;
          // Vision indoklás elöl, utána a tényszerű hely/idő pontok
          const factual = attributeReasons(lost, other, prelim).filter((r) =>
            r.startsWith("A két") || r.startsWith("Ugyanaz") || r.startsWith("A két helyszín")
          );
          reasons = [...cmp.reasons, ...factual];
        }
      }

      if (verdict === "UNLIKELY" && finalScore < PERSIST_THRESHOLD) continue;

      const existing = await prisma.reportMatch.findUnique({
        where: { reportAId_reportBId: { reportAId: lost.id, reportBId: other.id } },
      });

      const match = await prisma.reportMatch.upsert({
        where: { reportAId_reportBId: { reportAId: lost.id, reportBId: other.id } },
        create: {
          reportAId: lost.id,
          reportBId: other.id,
          score: finalScore,
          verdict,
          reasons,
          distanceKm: prelim.distanceKm,
          daysApart: prelim.daysApart,
        },
        update: {
          score: finalScore,
          verdict,
          reasons,
          distanceKm: prelim.distanceKm,
          daysApart: prelim.daysApart,
        },
      });

      // Értesítés: erős, még nem dismissed és még nem értesített egyezésnél a
      // KORÁBBI bejelentés gazdáját értesítjük (az új bejelentő épp az oldalon van).
      if (verdict === "LIKELY" && !match.dismissed && !match.notified) {
        const priorReport = candidate; // a már létező bejelentés
        const base = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";

        // In-app értesítés a harang-ikonhoz (ha a korábbi bejelentésnek van gazdája)
        if (priorReport.userId) {
          await createNotification({
            userId: priorReport.userId,
            type:   "REPORT_MATCH_FOUND",
            title:  "Lehetséges egyezés a bejelentésedre",
            body:   reasons[0] ?? `Új ${TYPE_LABEL[report.type].toLowerCase()} bejelentés illeszkedhet a tiédhez.`,
            href:   `/reports/${priorReport.id}`,
          }).catch((err) => console.error("report match notification error:", err));
        }

        try {
          await sendReportMatchEmail({
            to: priorReport.contactEmail,
            contactName: priorReport.contactName,
            matchType: TYPE_LABEL[report.type],
            reasons,
            reportUrl: `${base}/reports/${priorReport.id}`,
          });
          await prisma.reportMatch.update({
            where: { id: match.id },
            data: { notified: true },
          });
        } catch (err) {
          console.error("report match email error:", err);
        }
      }
    }
  } catch (err) {
    console.error("runMatchingForReport error:", err);
  }
}
