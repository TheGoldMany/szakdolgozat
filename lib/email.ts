import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? "ÁllatiMenhelyek.hu <noreply@allatimenhelyek.hu>";
const BASE = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";

export async function sendNewMessageEmail(opts: {
  to:              string;
  recipientName:   string;
  senderName:      string;
  animalName:      string;
  preview:         string;
  conversationUrl: string;
}) {
  await transporter.sendMail({
    from:    FROM,
    to:      opts.to,
    subject: `Új üzenet érkezett – ÁllatiMenhelyek.hu`,
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
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
  await transporter.sendMail({
    from:    FROM,
    to:      opts.to,
    subject: `Üzenet a bejelentésedről – ÁllatiMenhelyek.hu`,
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
    replyTo: opts.senderEmail,
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

  await transporter.sendMail({
    from:    FROM,
    to:      opts.to,
    subject,
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
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
  await transporter.sendMail({
    from:    FROM,
    to:      opts.to,
    subject: `Új adomány érkezett – ÁllatiMenhelyek.hu`,
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
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
  await transporter.sendMail({
    from:    FROM,
    to:      opts.to,
    subject: `Sikeres feliratkozás – ÁllatiMenhelyek.hu`,
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: "Jelszó visszaállítása – ÁllatiMenhelyek.hu",
    html: `
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
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:11px">ÁllatiMenhelyek.hu</p>
      </div>
    `,
  });
}
