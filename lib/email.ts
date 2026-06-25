import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const FROM = process.env.RESEND_FROM ?? "ÁllatiMenhelyek.hu <onboarding@resend.dev>";
const BASE = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";

// ── Core transport (Resend REST API) ─────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY nincs beállítva – email kihagyva:", subject);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend hiba ${res.status}: ${err}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function unsubscribeToken(email: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

function emailFooter(to: string): string {
  const token = unsubscribeToken(to);
  const url   = `${BASE}/api/auth/unsubscribe?email=${encodeURIComponent(to)}&token=${token}`;
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="color:#9ca3af;font-size:11px">
      ÁllatiMenhelyek.hu &nbsp;·&nbsp;
      <a href="${url}" style="color:#9ca3af;text-decoration:underline">Leiratkozás az értesítésekről</a>
    </p>
  `;
}

const SYSTEM_FOOTER = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
`;

// Sends only if the recipient hasn't opted out of email notifications.
async function sendNotificationEmail(to: string, fn: () => Promise<void>): Promise<void> {
  const user = await prisma.user.findUnique({
    where:  { email: to.toLowerCase() },
    select: { emailNotifications: true },
  });
  if (user?.emailNotifications === false) return;
  await fn();
}

// ── Notification emails (respect opt-out) ────────────────────────────────────

export async function sendNewMessageEmail(opts: {
  to:              string;
  recipientName:   string;
  senderName:      string;
  animalName:      string;
  preview:         string;
  conversationUrl: string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Új üzenet érkezett – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Új üzenet érkezett
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.recipientName}!<br/>
            <strong>${opts.senderName}</strong> üzenetet küldött neked
            a(z) <strong>${opts.animalName}</strong> témában.
          </p>
          <blockquote style="border-left:3px solid #22c55e;margin:16px 0;padding:12px 16px;
                             background:#f0fdf4;color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            ${opts.preview}
          </blockquote>
          <a href="${opts.conversationUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Üzenet megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendReportMessageEmail(opts: {
  to:           string;
  contactName:  string;
  senderName:   string;
  senderEmail:  string;
  reportTitle:  string;
  reportUrl:    string;
  message:      string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Üzenet a bejelentésedről – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Új üzenet érkezett
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.contactName}!<br/>
            <strong>${opts.senderName}</strong> (${opts.senderEmail}) üzenetet küldött
            a(z) <a href="${opts.reportUrl}" style="color:#16a34a">${opts.reportTitle}</a>
            bejelentéseddel kapcsolatban:
          </p>
          <blockquote style="border-left:3px solid #22c55e;margin:16px 0;padding:12px 16px;
                             background:#f0fdf4;color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            ${opts.message.replace(/\n/g, "<br/>")}
          </blockquote>
          <p style="color:#374151;font-size:14px">
            Válaszolhatsz közvetlenül erre az emailre, vagy felveheted a kapcsolatot a feladóval:
            <a href="mailto:${opts.senderEmail}" style="color:#16a34a">${opts.senderEmail}</a>
          </p>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendApplicationStatusEmail(opts: {
  to:          string;
  name:        string;
  animalName:  string;
  status:      "APPROVED" | "REJECTED";
  reviewNotes: string | null;
}) {
  const approved = opts.status === "APPROVED";
  const subject  = approved
    ? `Gratulálunk! Örökbefogadási kérelmed jóváhagyva – ÁllatiMenhelyek.hu`
    : `Örökbefogadási kérelmed elutasítva – ÁllatiMenhelyek.hu`;

  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, subject, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:${approved ? "#166534" : "#991b1b"};margin-bottom:8px">
            ${approved ? "Kérelmed jóváhagyva!" : "Kérelmed elutasítva"}
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            A(z) <strong>${opts.animalName}</strong> örökbefogadási kérelmed
            <strong>${approved ? "jóváhagyták" : "elutasították"}</strong>.
          </p>
          ${opts.reviewNotes ? `
          <div style="border-left:3px solid ${approved ? "#22c55e" : "#ef4444"};margin:16px 0;padding:12px 16px;
                      background:${approved ? "#f0fdf4" : "#fef2f2"};color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            <strong>Megjegyzés:</strong><br/>${opts.reviewNotes}
          </div>` : ""}
          <a href="${BASE}/applications"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Kérelmeim megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendDonationReceivedEmail(opts: {
  to:            string;
  recipientName: string;
  campaignTitle: string;
  amount:        number;
  donorName:     string | null;
  campaignUrl:   string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Új adomány érkezett – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Új adomány érkezett!
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.recipientName}!<br/>
            <strong>${opts.donorName ?? "Névtelen adományozó"}</strong> adományt küldött
            a(z) <strong>${opts.campaignTitle}</strong> kampányhoz.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:700;color:#166534">
              ${opts.amount.toLocaleString("hu-HU")} Ft
            </span>
          </div>
          <a href="${opts.campaignUrl}"
             style="display:inline-block;margin:8px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Kampány megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSubscriptionConfirmationEmail(opts: {
  to:           string;
  name:         string;
  shelterName:  string;
  tierName:     string;
  amount:       number;
  shelterSlug:  string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Sikeres feliratkozás – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Köszönjük a feliratkozást!
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Sikeresen feliratkoztál a(z) <strong>${opts.shelterName}</strong> menhely
            <strong>${opts.tierName}</strong> csomagjára.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:24px;font-weight:700;color:#166534">
              ${opts.amount.toLocaleString("hu-HU")} Ft / hó
            </span>
          </div>
          <p style="color:#374151;font-size:13px;line-height:1.6">
            Az előfizetésedet a <a href="${BASE}/profile" style="color:#16a34a">profilodban</a>
            bármikor lemondhatod.
          </p>
          <a href="${BASE}/shelters/${opts.shelterSlug}"
             style="display:inline-block;margin:8px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Menhely megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendEventRegistrationEmail(opts: {
  to:            string;
  name:          string;
  eventTitle:    string;
  eventDate:     string;
  eventLocation: string;
  guests:        number;
  eventUrl:      string;
}) {
  const guestLine = opts.guests > 0
    ? `<p style="color:#374151;font-size:14px">Kísérők száma: <strong>${opts.guests}</strong></p>`
    : "";

  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Sikeres jelentkezés: ${opts.eventTitle} – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Sikeres esemény-jelentkezés!
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Sikeresen jelentkeztél a következő eseményre:
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#166534">${opts.eventTitle}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151">📅 ${opts.eventDate}</p>
            <p style="margin:0;font-size:14px;color:#374151">📍 ${opts.eventLocation}</p>
          </div>
          ${guestLine}
          <a href="${opts.eventUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Esemény részletei
          </a>
          <p style="color:#6b7280;font-size:12px">A jelentkezésedet bármikor lemondhatod az esemény oldalán.</p>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendEventCancelledEmail(opts: {
  to:         string;
  name:       string;
  eventTitle: string;
  eventDate:  string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Esemény lemondva: ${opts.eventTitle} – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#991b1b;margin-bottom:8px">
            Esemény lemondva
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Sajnos a következő esemény, amelyre jelentkeztél, elmaradt:
          </p>
          <div style="background:#fef2f2;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #ef4444">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#991b1b">${opts.eventTitle}</p>
            <p style="margin:0;font-size:14px;color:#374151">📅 ${opts.eventDate}</p>
          </div>
          <p style="color:#374151;font-size:14px">
            Köszönjük a megértésedet. Nézd meg más közelgő eseményeinket!
          </p>
          <a href="${BASE}/events"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Események böngészése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendFosterStatusEmail(opts: {
  to:          string;
  name:        string;
  shelterName: string;
  status:      "ACTIVE" | "REJECTED";
  adminNote:   string | null;
}) {
  const approved = opts.status === "ACTIVE";
  const subject  = approved
    ? `Ideiglenes befogadói jelentkezésed jóváhagyva – ÁllatiMenhelyek.hu`
    : `Ideiglenes befogadói jelentkezésed elutasítva – ÁllatiMenhelyek.hu`;

  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, subject, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:${approved ? "#166534" : "#991b1b"};margin-bottom:8px">
            ${approved ? "Jelentkezésed jóváhagyva!" : "Jelentkezésed elutasítva"}
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            A(z) <strong>${opts.shelterName}</strong> menhely
            <strong>${approved ? "jóváhagyta" : "elutasította"}</strong>
            az ideiglenes befogadói jelentkezésedet.
          </p>
          ${opts.adminNote ? `
          <div style="border-left:3px solid ${approved ? "#22c55e" : "#ef4444"};margin:16px 0;padding:12px 16px;
                      background:${approved ? "#f0fdf4" : "#fef2f2"};color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            <strong>Megjegyzés:</strong><br/>${opts.adminNote}
          </div>` : ""}
          ${approved ? `
          <a href="${BASE}/foster"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Ideiglenes befogadás oldala
          </a>` : ""}
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSponsorshipStartedEmail(opts: {
  to:          string;
  name:        string;
  animalName:  string;
  animalSlug:  string;
  amount:      number;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Köszönjük! Virtuális örökbefogadás aktiválva – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Köszönjük a támogatást!
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Sikeresen elindítottad a virtuális örökbefogadásodat.
            Mostantól te <strong>${opts.animalName}</strong> virtuális gazdája vagy!
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:700;color:#166534">
              ${opts.amount.toLocaleString("hu-HU")} Ft / hó
            </span>
          </div>
          <p style="color:#374151;font-size:13px;line-height:1.6">
            A virtuális örökbefogadásodat a
            <a href="${BASE}/profile" style="color:#16a34a">profilodban</a>
            bármikor megtekintheted és lemondhatod.
          </p>
          <a href="${BASE}/animals/${opts.animalSlug}"
             style="display:inline-block;margin:8px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            ${opts.animalName} oldala
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSponsorshipCancelledEmail(opts: {
  to:         string;
  name:       string;
  animalName: string;
  amount:     number;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Virtuális örökbefogadás lemondva – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#374151;margin-bottom:8px">
            Virtuális örökbefogadás lemondva
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Megerősítjük, hogy lemondtad a(z) <strong>${opts.animalName}</strong> virtuális
            örökbefogadásodat (<strong>${opts.amount.toLocaleString("hu-HU")} Ft/hó</strong>).
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            A jelenlegi számlázási időszak végéig az állat még a virtuális gazdáid között jelenik meg.
            Köszönjük az eddigi támogatásodat!
          </p>
          <a href="${BASE}/animals"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Állatokat böngészés
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendTransferRequestEmail(opts: {
  to:              string;
  adminName:       string;
  animalName:      string;
  fromShelterName: string;
  toShelterName:   string;
  requesterName:   string;
  note:            string | null;
  transferUrl:     string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Állat-áthelyezési kérelem érkezett – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Áthelyezési kérelem
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.adminName}!<br/>
            <strong>${opts.requesterName}</strong> áthelyezési kérelmet küldött:
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#166534">${opts.animalName}</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151">Feladó: ${opts.fromShelterName}</p>
            <p style="margin:0;font-size:14px;color:#374151">Fogadó: ${opts.toShelterName}</p>
          </div>
          ${opts.note ? `
          <blockquote style="border-left:3px solid #22c55e;margin:16px 0;padding:12px 16px;
                             background:#f0fdf4;color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            ${opts.note}
          </blockquote>` : ""}
          <a href="${opts.transferUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Kérelem megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendTransferResolvedEmail(opts: {
  to:              string;
  requesterName:   string;
  animalName:      string;
  toShelterName:   string;
  approved:        boolean;
  note:            string | null;
}) {
  const subject = opts.approved
    ? `Áthelyezési kérelem jóváhagyva: ${opts.animalName} – ÁllatiMenhelyek.hu`
    : `Áthelyezési kérelem elutasítva: ${opts.animalName} – ÁllatiMenhelyek.hu`;

  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, subject, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:${opts.approved ? "#166534" : "#991b1b"};margin-bottom:8px">
            ${opts.approved ? "Áthelyezés jóváhagyva!" : "Áthelyezés elutasítva"}
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.requesterName}!<br/>
            A(z) <strong>${opts.animalName}</strong> áthelyezési kérelme
            (cél: <strong>${opts.toShelterName}</strong>)
            <strong>${opts.approved ? "jóváhagyásra" : "elutasításra"} került</strong>.
          </p>
          ${opts.note ? `
          <div style="border-left:3px solid ${opts.approved ? "#22c55e" : "#ef4444"};margin:16px 0;padding:12px 16px;
                      background:${opts.approved ? "#f0fdf4" : "#fef2f2"};color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            <strong>Megjegyzés:</strong><br/>${opts.note}
          </div>` : ""}
          <a href="${BASE}/dashboard/transfers"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Áthelyezések megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendReportMatchEmail(opts: {
  to:          string;
  contactName: string;
  matchType:   string;
  reasons:     string[];
  reportUrl:   string;
}) {
  const reasonList = opts.reasons.length
    ? `<ul style="margin:12px 0;padding-left:18px;color:#374151;font-size:14px;line-height:1.7">
         ${opts.reasons.map((r) => `<li>${r}</li>`).join("")}
       </ul>`
    : "";

  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Lehetséges egyezés a bejelentésedre – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Találtunk egy lehetséges egyezést! 🐾
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.contactName}!<br/>
            Egy újabb <strong>${opts.matchType}</strong> bejelentés érkezett, amely a rendszerünk
            szerint egyezhet az általad beküldött bejelentéssel.
          </p>
          ${reasonList}
          <a href="${opts.reportUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Egyezés megtekintése
          </a>
          <p style="color:#9ca3af;font-size:12px">
            A találatot mesterséges intelligencia javasolta, ezért érdemes a fotókat és az adatokat
            személyesen is összevetni.
          </p>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendNearbyReportEmail(opts: {
  to:           string;
  adminName:    string;
  animalLabel:  string;
  city:         string;
  distanceKm:   number;
  description:  string;
  reportUrl:    string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Kóbor állat a közeletekben: ${opts.animalLabel} (${opts.city}) – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Kóbor állat a közeletekben 🐾
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.adminName}!<br/>
            Új kóbor <strong>${opts.animalLabel}</strong> bejelentés érkezett a menhelyetektől
            kb. <strong>${opts.distanceKm} km</strong> távolságra.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 4px;font-size:14px;color:#374151">📍 ${opts.city}</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${opts.description}</p>
          </div>
          <a href="${opts.reportUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Bejelentés megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendShelterSuspendedEmail(opts: {
  to:          string;
  adminName:   string;
  shelterName: string;
}) {
  await sendEmail(opts.to, `Menhely felfüggesztve: ${opts.shelterName} – ÁllatiMenhelyek.hu`, `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#b45309;margin-bottom:8px">
          Menhely felfüggesztve
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kedves ${opts.adminName}!<br/>
          A(z) <strong>${opts.shelterName}</strong> menhely profilja felfüggesztésre került a platformon.
          A felfüggesztés ideje alatt az oldal nem érhető el a látogatók számára.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Ha kérdésed van, vedd fel a kapcsolatot az adminisztrátorunkkal.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

export async function sendShelterReactivatedEmail(opts: {
  to:          string;
  adminName:   string;
  shelterName: string;
}) {
  await sendEmail(opts.to, `Menhely újra aktív: ${opts.shelterName} – ÁllatiMenhelyek.hu`, `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
          Menhely újra elérhető!
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kedves ${opts.adminName}!<br/>
          A(z) <strong>${opts.shelterName}</strong> menhely profilja ismét aktív, és elérhető a látogatók számára.
        </p>
        <a href="${BASE}/dashboard"
           style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                  font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
          Dashboard megnyitása
        </a>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

export async function sendShelterDeletedEmail(opts: {
  to:          string;
  adminName:   string;
  shelterName: string;
}) {
  await sendEmail(opts.to, `Menhely törölve: ${opts.shelterName} – ÁllatiMenhelyek.hu`, `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#991b1b;margin-bottom:8px">
          Menhely törölve
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kedves ${opts.adminName}!<br/>
          A(z) <strong>${opts.shelterName}</strong> menhely és az összes hozzá tartozó adat
          törlésre került a platformról.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Ha úgy gondolod, hogy ez tévedés, vedd fel a kapcsolatot az adminisztrátorunkkal.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

export async function sendPasswordChangedEmail(opts: {
  to:   string;
  name: string;
}) {
  await sendEmail(opts.to, `Jelszavad megváltozott – ÁllatiMenhelyek.hu`, `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#374151;margin-bottom:8px">
          Jelszóváltoztatás megerősítése
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kedves ${opts.name}!<br/>
          Fiókod jelszava sikeresen megváltozott.
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Ha te végezted ezt a változtatást, nincs további teendőd.<br/>
          Ha nem te változtattad meg a jelszavadat, azonnal állítsd vissza a
          <a href="${BASE}/auth/forgot-password" style="color:#16a34a">Elfelejtett jelszó</a>
          oldalon, és vedd fel a kapcsolatot ügyfélszolgálatunkkal.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

export async function sendDonationThankYouEmail(opts: {
  to:            string;
  name:          string;
  campaignTitle: string;
  amount:        number;
  campaignUrl:   string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Köszönjük az adományodat! – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Köszönjük az adományodat!
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Adományod sikeresen megérkezett a(z) <strong>${opts.campaignTitle}</strong> kampányhoz.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:32px;font-weight:700;color:#166534">
              ${opts.amount.toLocaleString("hu-HU")} Ft
            </span>
          </div>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Köszönjük, hogy hozzájárulsz az állatok jobb életéhez!
          </p>
          <a href="${opts.campaignUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Kampány megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSubscriptionCancelledEmail(opts: {
  to:          string;
  name:        string;
  tierName:    string;
  shelterName: string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Előfizetés lemondva – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#374151;margin-bottom:8px">
            Előfizetés lemondva
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            Megerősítjük, hogy lemondtad a(z) <strong>${opts.shelterName}</strong> menhely
            <strong>${opts.tierName}</strong> előfizetésedet.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            A jelenlegi számlázási időszak végéig hozzáférésed megmarad.
            Köszönjük az eddigi támogatásodat!
          </p>
          <a href="${BASE}/shelters"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Menhelyek böngészése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSubscriptionAdminCancelledEmail(opts: {
  to:          string;
  name:        string;
  tierName:    string;
  shelterName: string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Előfizetésed törölve – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#374151;margin-bottom:8px">
            Előfizetés törölve
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.name}!<br/>
            A(z) <strong>${opts.shelterName}</strong> menhely adminisztrátorai törölték a
            <strong>${opts.tierName}</strong> előfizetésedet.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Ha kérdésed van, vedd fel a kapcsolatot a menhely adminisztrátorával.
          </p>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendSubscriptionCancelledAdminEmail(opts: {
  to:             string;
  adminName:      string;
  subscriberName: string;
  tierName:       string;
  shelterName:    string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Előfizető lemondta előfizetését – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#374151;margin-bottom:8px">
            Előfizetés lemondva
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.adminName}!<br/>
            <strong>${opts.subscriberName}</strong> lemondta a(z) <strong>${opts.shelterName}</strong>
            menhely <strong>${opts.tierName}</strong> előfizetését.
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            A hozzáférése a jelenlegi számlázási időszak végéig megmarad.
          </p>
          <a href="${BASE}/dashboard/subscribers"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Előfizetők megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendNewAdoptionApplicationEmail(opts: {
  to:             string;
  adminName:      string;
  animalName:     string;
  applicantName:  string;
  applicationUrl: string;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Új örökbefogadási kérelem érkezett – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Új örökbefogadási kérelem
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.adminName}!<br/>
            <strong>${opts.applicantName}</strong> örökbefogadási kérelmet nyújtott be
            a(z) <strong>${opts.animalName}</strong> állatra.
          </p>
          <a href="${opts.applicationUrl}"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Kérelem megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendNewFosterApplicationEmail(opts: {
  to:            string;
  adminName:     string;
  applicantName: string;
  shelterName:   string;
  motivation:    string | null;
}) {
  await sendNotificationEmail(opts.to, async () => {
    await sendEmail(opts.to, `Új ideiglenes befogadói jelentkezés – ÁllatiMenhelyek.hu`, `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
          <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
            Új ideiglenes befogadói jelentkezés
          </h1>
          <p style="color:#374151;font-size:14px;line-height:1.6">
            Kedves ${opts.adminName}!<br/>
            <strong>${opts.applicantName}</strong> ideiglenes befogadónak jelentkezett
            a(z) <strong>${opts.shelterName}</strong> menhelyhez.
          </p>
          ${opts.motivation ? `
          <blockquote style="border-left:3px solid #22c55e;margin:16px 0;padding:12px 16px;
                             background:#f0fdf4;color:#374151;font-size:14px;line-height:1.6;border-radius:0 8px 8px 0">
            ${opts.motivation.replace(/\n/g, "<br/>")}
          </blockquote>` : ""}
          <a href="${BASE}/dashboard/foster"
             style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                    font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
            Jelentkezés megtekintése
          </a>
          ${emailFooter(opts.to)}
        </div>
      `);
  });
}

export async function sendShelterAdminInviteEmail(opts: {
  to:          string;
  adminName:   string;
  shelterName: string;
  password:    string;
}) {
  const loginUrl = `${BASE}/auth/login`;

  await sendEmail(opts.to, `Meghívó: menhely admin fiók – ÁllatiMenhelyek.hu`, `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
          Üdv a fedélzeten, ${opts.adminName}!
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Az ÁllatiMenhelyek.hu platformon létrehoztuk a
          <strong>${opts.shelterName}</strong> menhely admin fiókját a te nevedre.
          Az alábbiakkal tudsz bejelentkezni:
        </p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;font-family:monospace">
          <p style="margin:0 0 8px;font-size:13px;color:#374151">
            <strong>E-mail:</strong> ${opts.to}
          </p>
          <p style="margin:0;font-size:13px;color:#374151">
            <strong>Jelszó:</strong> ${opts.password}
          </p>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6">
          Bejelentkezés után a Dashboard → Beállítások menüben változtasd meg a jelszavadat.
        </p>
        <a href="${loginUrl}"
           style="display:inline-block;margin:16px 0;background:#22c55e;color:#fff;font-weight:600;
                  font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
          Bejelentkezés
        </a>
        <p style="color:#9ca3af;font-size:12px">
          Ha ez a meghívó nem neked szól, hagyd figyelmen kívül ezt az emailt.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

// ── System emails (security-critical – no opt-out, no unsubscribe link) ──────

export async function sendVerificationEmail(email: string, token: string, name?: string | null) {
  const url = `${BASE}/auth/verify-email?token=${token}`;

  await sendEmail(email, "Erősítsd meg az email-címed – ÁllatiMenhelyek.hu", `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
          Üdv a fedélzeten${name ? `, ${name}` : ""}!
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Köszönjük a regisztrációt! Már csak egy lépés van hátra:
          erősítsd meg az email-címed az alábbi gombbal.
          A link <strong>24 óráig</strong> érvényes.
        </p>
        <a href="${url}"
           style="display:inline-block;margin:24px 0;background:#22c55e;color:#fff;font-weight:600;
                  font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
          Email-cím megerősítése
        </a>
        <p style="color:#9ca3af;font-size:12px">
          Ha nem te regisztráltál, hagyd figyelmen kívül ezt az emailt.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE}/auth/reset-password?token=${token}`;

  await sendEmail(email, "Jelszó visszaállítása – ÁllatiMenhelyek.hu", `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#166534;margin-bottom:8px">
          Jelszó visszaállítása
        </h1>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Kaptuk a jelszó-visszaállítási kérelmedet.
          Kattints az alábbi gombra az új jelszó beállításához.
          A link <strong>1 óráig</strong> érvényes.
        </p>
        <a href="${url}"
           style="display:inline-block;margin:24px 0;background:#22c55e;color:#fff;font-weight:600;
                  font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none">
          Jelszó visszaállítása
        </a>
        <p style="color:#9ca3af;font-size:12px">
          Ha nem te kérted, hagyd figyelmen kívül ezt az emailt.
          A jelszavad nem változik automatikusan.
        </p>
        ${SYSTEM_FOOTER}
      </div>
    `);
}
