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
