import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Shield, Cookie, Lock, Eye, Trash2, Download, Mail, ExternalLink, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Adatvédelmi tájékoztató",
  description: "Az ÁllatiMenhelyek.hu adatvédelmi és cookie tájékoztatója – GDPR megfelelőség",
};

const EFFECTIVE_DATE = "2024. január 1.";
const CONTROLLER_NAME = "ÁllatiMenhelyek.hu";
const CONTROLLER_EMAIL = "info@allatimenhelyek.hu";
const NAIH_URL = "https://www.naih.hu";

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="mt-10 flex items-baseline gap-2.5 border-b border-gray-100 pb-2 text-xl font-bold text-gray-900">
      <span className="text-brand-500">{number}.</span>
      {title}
    </h2>
  );
}

function SubHeading({ title }: { title: string }) {
  return <h3 className="mt-6 text-base font-semibold text-gray-800">{title}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-7 text-gray-600">{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm leading-7 text-gray-600">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800">
      {children}
    </div>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 pr-4 text-sm font-medium text-gray-700 align-top w-[40%]">{label}</td>
      <td className="py-2.5 text-sm text-gray-600 align-top">{value}</td>
    </tr>
  );
}

type PrivacySummarySection = {
  number: string;
  heading: string;
  items: string[];
};

type PrivacySummaryContent = {
  legalLabel: string;
  title: string;
  summaryBadge: string;
  noticeLine1: string;
  noticeLine2: string;
  noticeLink: string;
  lastUpdated: string;
  footerTos: string;
  footerContact: string;
  sections: PrivacySummarySection[];
};

const SUMMARIES: Record<string, PrivacySummaryContent> = {
  en: {
    legalLabel: "Legal document",
    title: "Privacy Policy",
    summaryBadge: "Summary",
    noticeLine1:
      "This is a translated summary of the most important points. The full, legally binding Privacy Policy is written in Hungarian.",
    noticeLine2: "View the full Hungarian version",
    noticeLink: "/hu/adatvedelem",
    lastUpdated: "Last updated: 1 January 2024",
    footerTos: "Terms of Service",
    footerContact: "Contact",
    sections: [
      {
        number: "1",
        heading: "Data controller",
        items: [
          `Data controller: ${CONTROLLER_NAME}`,
          `Contact: ${CONTROLLER_EMAIL}`,
          "Registered in Hungary — Hungarian law applies.",
        ],
      },
      {
        number: "2",
        heading: "Data we collect",
        items: [
          "Account data: email address, display name, profile picture (optional), account creation date.",
          "Google OAuth tokens if you sign in with Google (no password stored in that case).",
          "Adoption application answers — collected on behalf of the shelter, which acts as data controller for this data.",
          "Payment transaction IDs, amounts, and statuses — we never store card details (Stripe handles that).",
        ],
      },
      {
        number: "3",
        heading: "Payment data & Stripe",
        items: [
          "All card data is handled exclusively by Stripe, Inc., which is certified to PCI DSS Level 1.",
          "We only store the transaction IDs returned by Stripe — never your card number, CVV, or expiry date.",
          "Stripe's privacy policy: stripe.com/privacy",
        ],
      },
      {
        number: "4",
        heading: "Your rights (GDPR)",
        items: [
          "Access (Art. 15): request information about what data we hold on you.",
          "Rectification (Art. 16): ask us to correct inaccurate data.",
          "Erasure (Art. 17): delete your account directly in Profile → Delete account.",
          "Data portability (Art. 20): download your data from Profile.",
          "Object to processing (Art. 21): contact us at " + CONTROLLER_EMAIL,
          "You can also contact your local data protection authority in your EU member state.",
        ],
      },
      {
        number: "5",
        heading: "Data retention",
        items: [
          "Account data: until deletion + 30 days grace period.",
          "Financial records: 8 years (Hungarian accounting law requirement).",
          "Session tokens: up to 30 days of inactivity.",
        ],
      },
      {
        number: "6",
        heading: "Data processors",
        items: [
          "Stripe, Inc. — payment processing (USA, EU–US Data Privacy Framework, PCI DSS L1).",
          "Google LLC — OAuth sign-in (USA, EU–US Data Privacy Framework).",
          "Vercel Inc. — application hosting (USA, EU–US Data Privacy Framework).",
          "Shelters — adoption application data (EU, Hungary) — shelters act as independent data controllers.",
        ],
      },
      {
        number: "7",
        heading: "Supervisory authority",
        items: [
          "Hungarian authority: NAIH (Nemzeti Adatvédelmi és Információszabadság Hatóság) — naih.hu / ugyfelszolgalat@naih.hu",
          "EU residents may also lodge a complaint with the data protection authority in their own member state.",
        ],
      },
      {
        number: "8",
        heading: "Contact for privacy questions",
        items: [CONTROLLER_EMAIL],
      },
    ],
  },
  de: {
    legalLabel: "Rechtsdokument",
    title: "Datenschutzerklärung",
    summaryBadge: "Zusammenfassung",
    noticeLine1:
      "Dies ist eine übersetzte Zusammenfassung der wichtigsten Punkte. Die vollständige, rechtlich bindende Datenschutzerklärung ist auf Ungarisch verfasst.",
    noticeLine2: "Vollständige ungarische Version anzeigen",
    noticeLink: "/hu/adatvedelem",
    lastUpdated: "Zuletzt aktualisiert: 1. Januar 2024",
    footerTos: "AGB",
    footerContact: "Kontakt",
    sections: [
      {
        number: "1",
        heading: "Verantwortlicher",
        items: [
          `Verantwortlicher: ${CONTROLLER_NAME}`,
          `Kontakt: ${CONTROLLER_EMAIL}`,
          "Registriert in Ungarn – ungarisches Recht ist anwendbar.",
        ],
      },
      {
        number: "2",
        heading: "Erhobene Daten",
        items: [
          "Kontodaten: E-Mail-Adresse, Anzeigename, Profilbild (optional), Erstellungsdatum des Kontos.",
          "Google-OAuth-Token bei Anmeldung mit Google (kein Passwort wird in diesem Fall gespeichert).",
          "Antworten auf Adoptionsanträge — im Auftrag des Tierheims erhoben, das als Verantwortlicher für diese Daten gilt.",
          "Zahlungstransaktions-IDs, Beträge und Status — wir speichern niemals Kartendaten (das übernimmt Stripe).",
        ],
      },
      {
        number: "3",
        heading: "Zahlungsdaten & Stripe",
        items: [
          "Alle Kartendaten werden ausschließlich von Stripe, Inc. verarbeitet, das nach PCI DSS Level 1 zertifiziert ist.",
          "Wir speichern nur die von Stripe zurückgegebenen Transaktions-IDs — niemals Ihre Kartennummer, CVV oder das Ablaufdatum.",
          "Datenschutzrichtlinie von Stripe: stripe.com/privacy",
        ],
      },
      {
        number: "4",
        heading: "Ihre Rechte (DSGVO)",
        items: [
          "Auskunft (Art. 15): Informationen darüber anfordern, welche Daten wir über Sie haben.",
          "Berichtigung (Art. 16): uns bitten, unrichtige Daten zu korrigieren.",
          "Löschung (Art. 17): Konto direkt unter Profil → Konto löschen löschen.",
          "Datenübertragbarkeit (Art. 20): Daten unter Profil herunterladen.",
          "Widerspruch (Art. 21): Kontaktieren Sie uns unter " + CONTROLLER_EMAIL,
          "Sie können sich auch an die Datenschutzbehörde Ihres EU-Mitgliedstaates wenden.",
        ],
      },
      {
        number: "5",
        heading: "Speicherdauer",
        items: [
          "Kontodaten: bis zur Löschung + 30 Tage Kulanzfrist.",
          "Finanzunterlagen: 8 Jahre (ungarische buchhalterische Pflicht).",
          "Sitzungstoken: bis zu 30 Tage Inaktivität.",
        ],
      },
      {
        number: "6",
        heading: "Auftragsverarbeiter",
        items: [
          "Stripe, Inc. — Zahlungsabwicklung (USA, EU–US Data Privacy Framework, PCI DSS L1).",
          "Google LLC — OAuth-Anmeldung (USA, EU–US Data Privacy Framework).",
          "Vercel Inc. — Anwendungshosting (USA, EU–US Data Privacy Framework).",
          "Tierheime — Adoptionsantragsdaten (EU, Ungarn) — Tierheime handeln als eigenständige Verantwortliche.",
        ],
      },
      {
        number: "7",
        heading: "Aufsichtsbehörde",
        items: [
          "Ungarische Behörde: NAIH (Nemzeti Adatvédelmi és Információszabadság Hatóság) — naih.hu / ugyfelszolgalat@naih.hu",
          "EU-Einwohner können auch bei der Datenschutzbehörde ihres eigenen Mitgliedstaates Beschwerde einlegen.",
        ],
      },
      {
        number: "8",
        heading: "Kontakt bei Datenschutzfragen",
        items: [CONTROLLER_EMAIL],
      },
    ],
  },
  pl: {
    legalLabel: "Dokument prawny",
    title: "Polityka prywatności",
    summaryBadge: "Podsumowanie",
    noticeLine1:
      "To jest przetłumaczone podsumowanie najważniejszych punktów. Pełna, prawnie wiążąca Polityka prywatności sporządzona jest w języku węgierskim.",
    noticeLine2: "Zobacz pełną wersję węgierską",
    noticeLink: "/hu/adatvedelem",
    lastUpdated: "Ostatnia aktualizacja: 1 stycznia 2024",
    footerTos: "Regulamin",
    footerContact: "Kontakt",
    sections: [
      {
        number: "1",
        heading: "Administrator danych",
        items: [
          `Administrator: ${CONTROLLER_NAME}`,
          `Kontakt: ${CONTROLLER_EMAIL}`,
          "Zarejestrowany na Węgrzech — stosuje się prawo węgierskie.",
        ],
      },
      {
        number: "2",
        heading: "Zbierane dane",
        items: [
          "Dane konta: adres e-mail, nazwa wyświetlana, zdjęcie profilowe (opcjonalne), data utworzenia konta.",
          "Tokeny Google OAuth przy logowaniu przez Google (w tym przypadku hasło nie jest przechowywane).",
          "Odpowiedzi we wnioskach adopcyjnych — zbierane w imieniu schroniska, które jest administratorem tych danych.",
          "Identyfikatory transakcji płatniczych, kwoty i statusy — nigdy nie przechowujemy danych karty (zajmuje się tym Stripe).",
        ],
      },
      {
        number: "3",
        heading: "Dane płatnicze i Stripe",
        items: [
          "Wszystkie dane karty są przetwarzane wyłącznie przez Stripe, Inc., certyfikowany na poziomie PCI DSS Level 1.",
          "Przechowujemy tylko identyfikatory transakcji zwrócone przez Stripe — nigdy numer karty, CVV ani datę ważności.",
          "Polityka prywatności Stripe: stripe.com/privacy",
        ],
      },
      {
        number: "4",
        heading: "Twoje prawa (RODO)",
        items: [
          "Dostęp (art. 15): zażądaj informacji o danych, które przechowujemy.",
          "Sprostowanie (art. 16): poproś nas o poprawienie nieprawidłowych danych.",
          "Usunięcie (art. 17): usuń konto bezpośrednio w Profil → Usuń konto.",
          "Przenoszenie danych (art. 20): pobierz swoje dane w Profilu.",
          "Sprzeciw (art. 21): skontaktuj się z nami pod adresem " + CONTROLLER_EMAIL,
          "Możesz też złożyć skargę do organu ochrony danych w swoim państwie członkowskim UE.",
        ],
      },
      {
        number: "5",
        heading: "Okres przechowywania danych",
        items: [
          "Dane konta: do usunięcia + 30 dni okresu karencji.",
          "Dokumentacja finansowa: 8 lat (wymóg węgierskiego prawa rachunkowego).",
          "Tokeny sesji: do 30 dni nieaktywności.",
        ],
      },
      {
        number: "6",
        heading: "Podmioty przetwarzające",
        items: [
          "Stripe, Inc. — przetwarzanie płatności (USA, EU–US Data Privacy Framework, PCI DSS L1).",
          "Google LLC — logowanie OAuth (USA, EU–US Data Privacy Framework).",
          "Vercel Inc. — hosting aplikacji (USA, EU–US Data Privacy Framework).",
          "Schroniska — dane wniosków adopcyjnych (UE, Węgry) — schroniska działają jako niezależni administratorzy.",
        ],
      },
      {
        number: "7",
        heading: "Organ nadzorczy",
        items: [
          "Organ węgierski: NAIH (Nemzeti Adatvédelmi és Információszabadság Hatóság) — naih.hu / ugyfelszolgalat@naih.hu",
          "Mieszkańcy UE mogą również złożyć skargę do organu ochrony danych we własnym państwie członkowskim.",
        ],
      },
      {
        number: "8",
        heading: "Kontakt w sprawach prywatności",
        items: [CONTROLLER_EMAIL],
      },
    ],
  },
};

function AdatvedelemSummaryPage({ locale }: { locale: string }) {
  const content = SUMMARIES[locale];
  if (!content) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
              <Shield className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                {content.legalLabel} &nbsp;·&nbsp; {content.summaryBadge}
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl text-gray-900">{content.title}</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {content.lastUpdated} &nbsp;·&nbsp; Platform: <strong>{CONTROLLER_NAME}</strong>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              {content.noticeLine1}{" "}
              <Link
                href={content.noticeLink}
                className="font-semibold underline underline-offset-2 hover:text-amber-900"
              >
                {content.noticeLine2} →
              </Link>
            </span>
          </div>

          {content.sections.map((section) => (
            <div key={section.number}>
              <SectionHeading number={section.number} title={section.heading} />
              <UL items={section.items} />
            </div>
          ))}

          <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            {content.lastUpdated} &nbsp;·&nbsp;{" "}
            <Link href="/aszf" className="hover:text-brand-500">
              {content.footerTos}
            </Link>
            {" "}&nbsp;·&nbsp;{" "}
            <Link href="/kapcsolat" className="hover:text-brand-500">
              {content.footerContact}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdatvedelemPage({ params: { locale } }: { params: { locale: string } }) {
  if (locale !== "hu") {
    return <AdatvedelemSummaryPage locale={locale} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
              <Shield className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Jogi dokumentum</p>
              <h1 className="text-2xl font-bold sm:text-3xl text-gray-900">Adatvédelmi tájékoztató</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Hatályos: <strong>{EFFECTIVE_DATE}</strong> &nbsp;·&nbsp; Platform: <strong>{CONTROLLER_NAME}</strong>
          </p>

          {/* TOC */}
          <nav className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Tartalom</p>
            <ol className="space-y-1.5 text-sm text-brand-600">
              {[
                "Az adatkezelő adatai",
                "A kezelt személyes adatok köre",
                "Az adatkezelés célja és jogalapja",
                "Adatmegőrzési idők",
                "Adatfeldolgozók és továbbítás",
                "Az érintett jogai",
                "Adatvédelmi incidens",
                "Felügyeleti hatóság",
                "Cookie tájékoztató",
                "A tájékoztató módosítása",
              ].map((title, i) => (
                <li key={i}>
                  <a href={`#section-${i + 1}`} className="hover:underline">
                    {i + 1}. {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-10">

          <P>
            Az <strong>{CONTROLLER_NAME}</strong> (a továbbiakban: „Platform", „mi") elkötelezett a felhasználók
            személyes adatainak védelme iránt. Jelen tájékoztató az Európai Parlament és a Tanács (EU) 2016/679
            rendelete (GDPR) és a 2011. évi CXII. törvény (Infotv.) alapján ismerteti, milyen személyes adatokat
            kezelünk, milyen célból, és milyen jogai vannak az érintetteknek.
          </P>

          {/* 1 */}
          <div id="section-1"><SectionHeading number="1" title="Az adatkezelő adatai" /></div>
          <table className="mt-4 w-full">
            <tbody>
              <TableRow label="Megnevezés" value={CONTROLLER_NAME} />
              <TableRow label="Székhely" value="Magyarország" />
              <TableRow label="Kapcsolattartó e-mail" value={CONTROLLER_EMAIL} />
              <TableRow label="Weboldal" value="allatimenhelyek.hu" />
              <TableRow label="GDPR kapcsolattartó" value={CONTROLLER_EMAIL} />
            </tbody>
          </table>

          {/* 2 */}
          <div id="section-2"><SectionHeading number="2" title="A kezelt személyes adatok köre" /></div>

          <SubHeading title="2.1 Regisztrációs és fiókadatok" />
          <UL items={[
            "Név (megjelenítési név)",
            "E-mail cím",
            "Jelszó (bcrypt titkosítással tárolva – visszafejthetetlen)",
            "Profilkép URL (opcionális, OAuth esetén automatikusan)",
            "Szerepkör (USER / SHELTER_ADMIN / SUPER_ADMIN)",
            "E-mail-megerősítés dátuma, fiók létrehozásának és módosításának ideje",
          ]} />

          <SubHeading title="2.2 Közösségi bejelentkezési adatok (OAuth)" />
          <P>
            Ha Google-fiókkal jelentkezik be, az OAuth-szolgáltatótól a következők kerülnek tárolásra:
            hozzáférési token, frissítési token, azonosító token, token lejárati ideje, a külső szolgáltatónál
            lévő fiók azonosítója. Jelszó ilyenkor nem kerül rögzítésre.
          </P>

          <SubHeading title="2.3 Örökbefogadási kérelmi adatok" />
          <P>
            Az örökbefogadási kérelem kitöltésekor a menhely által meghatározott egyedi kérdőív alapján
            személyes adatokat adhat meg (pl. lakcím, lakhatási körülmények, állattartási tapasztalat).
            Az így megadott adatokat a kérelem céljaira a menhely, mint adatkezelő dolgozza fel;
            a Platform adatfeldolgozóként jár el.
          </P>

          <SubHeading title="2.4 Fizetési adatok" />
          <P>
            Adományok és előfizetési díjak fizetésekor a kártyaadatokat <strong>nem mi tároljuk</strong> –
            azokat kizárólag a Stripe, Inc. kezeli PCI DSS Level 1 tanúsítvánnyal. Mi csak a Stripe által
            visszaadott tranzakcióazonosítókat, összegeket és fizetési státuszokat tároljuk.
          </P>

          <SubHeading title="2.5 Kommunikációs adatok" />
          <UL items={[
            "Felhasználók közötti üzenetváltások tartalma (menhely–örökbefogadó)",
            "Értékelések szövege és pontszáma",
            "Elküldés időpontja",
          ]} />

          <SubHeading title="2.6 Bejelentési adatok (elveszett/megtalált állat)" />
          <UL items={[
            "Kapcsolattartó neve, telefonszáma, e-mail címe",
            "Bejelentés helyszíne (város, utca)",
            "Leírás szövege, bejelentett állat adatai",
            "Feltöltött kép URL-je (ha van)",
          ]} />

          <SubHeading title="2.7 Önkéntesi és ideiglenes befogadói adatok" />
          <P>
            Az önkéntességi és ideiglenes befogadói profil létrehozásakor a kérvény státusza kerül
            rögzítésre. A konkrét személyes adatok (lakhatás, tapasztalat stb.) az adott menhely
            kérdőívén keresztül kerülnek megadásra (2.3. pont).
          </P>

          <SubHeading title="2.8 Tevékenységnapló" />
          <P>
            A platform biztonsága és üzemeltetése érdekében naplózzuk a fontos eseményeket
            (bejelentkezés, kérelem-benyújtás, fizetés). Ezek nem kerülnek felhasználói profilhoz
            rendelve marketingcélra.
          </P>

          {/* 3 */}
          <div id="section-3"><SectionHeading number="3" title="Az adatkezelés célja és jogalapja" /></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 rounded-tl-lg">Cél</th>
                  <th className="px-3 py-2.5">Adatkör</th>
                  <th className="px-3 py-2.5 rounded-tr-lg">Jogalap (GDPR 6. cikk)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ["Fiókregisztráció és hitelesítés", "E-mail, jelszó, név", "(b) szerződés teljesítése"],
                  ["Örökbefogadási kérelem lebonyolítása", "Kérdőív válaszok", "(b) szerződés teljesítése"],
                  ["Fizetés feldolgozása", "Tranzakció-azonosítók", "(b) szerződés teljesítése"],
                  ["Üzenetváltás menhelyekkel", "Üzenetek tartalma", "(b) szerződés teljesítése"],
                  ["Bejelentések kezelése", "Kapcsolattartó adatok", "(f) jogos érdek"],
                  ["Platform biztonsága, visszaélés-megelőzés", "Tevékenységnapló", "(f) jogos érdek"],
                  ["Törvényi kötelezettségek (számvitel)", "Pénzügyi adatok", "(c) jogi kötelezettség"],
                  ["E-mail értesítések küldése", "E-mail cím", "(b) szerződés teljesítése"],
                ].map(([cel, adat, jogalap], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-700">{cel}</td>
                    <td className="px-3 py-2.5 text-gray-500">{adat}</td>
                    <td className="px-3 py-2.5 text-gray-500">{jogalap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4 */}
          <div id="section-4"><SectionHeading number="4" title="Adatmegőrzési idők" /></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 rounded-tl-lg">Adatkategória</th>
                  <th className="px-3 py-2.5 rounded-tr-lg">Megőrzési idő</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ["Fiókadatok", "A fiók törléséig, illetve 30 nappal a törlési kérés után véglegesen"],
                  ["Munkamenet (session) tokenek", "A munkamenet lejártáig (max. 30 nap inaktivitás)"],
                  ["Örökbefogadási kérelmek", "A kérelem lezárásától számított 3 év"],
                  ["Pénzügyi tranzakciók", "8 év (számviteli törvény – 2000. évi C. tv.)"],
                  ["Üzenetek", "A fiók törléséig, majd 90 nap türelmi idő"],
                  ["Bejelentések", "A bejelentés lezárásától számított 1 év"],
                  ["Értékelések", "A fiók törléséig (anonimizálva megtartható)"],
                  ["Biztonsági naplók", "90 nap"],
                ].map(([kategoria, ido], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-700">{kategoria}</td>
                    <td className="px-3 py-2.5 text-gray-500">{ido}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5 */}
          <div id="section-5"><SectionHeading number="5" title="Adatfeldolgozók és továbbítás" /></div>
          <P>
            Személyes adatait az alábbi adatfeldolgozókkal osztjuk meg, akik a mi utasításaink alapján
            járnak el:
          </P>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 rounded-tl-lg">Adatfeldolgozó</th>
                  <th className="px-3 py-2.5">Cél</th>
                  <th className="px-3 py-2.5 rounded-tr-lg">Székhely / Garanciák</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ["Stripe, Inc.", "Fizetés feldolgozása, előfizetések kezelése", "USA – EU–US Data Privacy Framework, PCI DSS L1"],
                  ["Google LLC", "OAuth bejelentkezés, Google Fonts betöltése", "USA – EU–US Data Privacy Framework, SCC"],
                  ["Vercel Inc.", "Webalkalmazás hosztolása", "USA – EU–US Data Privacy Framework"],
                  ["Menhelyek (mint adatkezelők)", "Örökbefogadási kérelem adatok feldolgozása", "EU (Magyarország)"],
                ].map(([nev, cel, garancia], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-700">{nev}</td>
                    <td className="px-3 py-2.5 text-gray-500">{cel}</td>
                    <td className="px-3 py-2.5 text-gray-500">{garancia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <InfoBox>
            A Stripe fizetési platformra vonatkozó adatkezelési tájékoztató a{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer"
              className="font-medium underline">stripe.com/privacy</a> oldalon érhető el.
          </InfoBox>

          {/* 6 */}
          <div id="section-6"><SectionHeading number="6" title="Az érintett jogai" /></div>
          <P>
            A GDPR III. fejezete alapján az alábbi jogok illetik meg az érintetteket.
            Kérelmet a <strong>{CONTROLLER_EMAIL}</strong> e-mail-címre küldhet;
            azonosítás után 30 napon belül válaszolunk.
          </P>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { Icon: Eye,      title: "Hozzáférési jog (15. cikk)",    desc: "Tájékoztatást kérhet arról, hogy milyen adatait kezeljük." },
              { Icon: Lock,     title: "Helyesbítési jog (16. cikk)",   desc: "Kérheti pontatlan adatai kijavítását, hiányos adatok pótlását." },
              { Icon: Trash2,   title: "Törlési jog (17. cikk)",        desc: "Bizonyos feltételek esetén kérheti adatai törlését (\"elfelejtési jog\")." },
              { Icon: Shield,   title: "Korlátozás joga (18. cikk)",    desc: "Kérheti az adatkezelés korlátozását, amíg kifogása elbírálás alatt van." },
              { Icon: Download, title: "Adathordozhatóság (20. cikk)",  desc: "Strukturált, géppel olvasható formában kérheti adatai másolatát." },
              { Icon: Mail,     title: "Tiltakozás joga (21. cikk)",    desc: "Tiltakozhat az adatkezelés ellen, ha jogos érdek az alap." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                  <Icon className="h-4 w-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <P>
            Fiókjából közvetlenül is törölheti profilját a <strong>Profil → Fiók törlése</strong> menüpontban.
            A törlés 30 napos türelmi idő után lesz végleges, a számviteli előírások hatálya alá eső adatok kivételével.
          </P>

          {/* 7 */}
          <div id="section-7"><SectionHeading number="7" title="Adatvédelmi incidens" /></div>
          <P>
            Adatvédelmi incidens esetén (pl. jogosulatlan hozzáférés) a GDPR 33. cikke alapján 72 órán belül
            értesítjük a Nemzeti Adatvédelmi és Információszabadság Hatóságot (NAIH). Ha az incidens valószínűleg
            magas kockázatot jelent az érintetteknek, közvetlenül is tájékoztatjuk őket.
          </P>

          {/* 8 */}
          <div id="section-8"><SectionHeading number="8" title="Felügyeleti hatóság" /></div>
          <P>
            Ha úgy ítéli meg, hogy adatai kezelése sérti a GDPR rendelkezéseit, panaszt nyújthat be a
            Nemzeti Adatvédelmi és Információszabadság Hatóságnál:
          </P>
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800">Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</p>
            <p className="mt-1">Székhely: 1055 Budapest, Falk Miksa utca 9–11.</p>
            <p>Postacím: 1363 Budapest, Pf.: 9.</p>
            <p>Telefon: +36 (1) 391-1400</p>
            <p>E-mail: ugyfelszolgalat@naih.hu</p>
            <a href={NAIH_URL} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-brand-600 hover:underline font-medium">
              naih.hu <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* 9 – Cookie */}
          <div id="section-9">
            <div id="cookie">
              <SectionHeading number="9" title="Cookie tájékoztató" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Cookie className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-600">
              A platform cookie-kat (sütiket) használ a biztonságos és hatékony működés érdekében.
            </p>
          </div>

          <SubHeading title="9.1 Feltétlenül szükséges cookie-k" />
          <P>
            Ezek nélkül a platform nem működik megfelelően. Beleegyezés nélkül is alkalmazhatók (GDPR
            Recital 47; ePrivacy irányelv 5(3) kivétel).
          </P>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 rounded-tl-lg">Cookie neve</th>
                  <th className="px-3 py-2">Leírás</th>
                  <th className="px-3 py-2 rounded-tr-lg">Élettartam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                {[
                  ["next-auth.session-token", "Bejelentkezett munkamenet azonosítója (HttpOnly, Secure)", "30 nap (inaktivitás esetén rövidebb)"],
                  ["next-auth.csrf-token", "CSRF-támadások elleni védelem", "Munkamenet végéig"],
                  ["next-auth.callback-url", "Sikeres bejelentkezés utáni átirányítási URL", "Munkamenet végéig"],
                  ["__Secure-next-auth.session-token", "HTTPS-en a session token biztonságos változata", "30 nap"],
                ].map(([nev, leiras, elettartam], i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{nev}</td>
                    <td className="px-3 py-2">{leiras}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{elettartam}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SubHeading title="9.2 Funkcionális cookie-k" />
          <UL items={[
            "Nyelvi beállítás (kiválasztott locale: hu/en/de/pl) – a böngésző URL-struktúrájában tárolódik, nem külön cookie-ban.",
          ]} />

          <SubHeading title="9.3 Analitikai és marketing cookie-k" />
          <P>
            A platform jelenleg nem használ harmadik feles analitikai vagy marketing cookie-kat
            (pl. Google Analytics, Facebook Pixel). Amennyiben ezt a jövőben bevezetnénk,
            előzetes beleegyezést kérünk.
          </P>

          <SubHeading title="9.4 Cookie-k kezelése" />
          <P>
            A cookie-kat böngészőjében bármikor törölheti vagy tilthatja. Ezzel azonban a bejelentkezés
            funkció nem lesz elérhető. Legfőbb böngészők beállításai:
          </P>
          <UL items={[
            "Chrome: Beállítások → Adatvédelem és biztonság → Cookie-k és egyéb webhelyadatok",
            "Firefox: Beállítások → Adatvédelem és biztonság → Cookie-k és webhelyadatok",
            "Safari: Beállítások → Adatvédelem → Cookie-k és webhelyadatok kezelése",
            "Edge: Beállítások → Cookie-k és webhelyadatok",
          ]} />

          {/* 10 */}
          <div id="section-10"><SectionHeading number="10" title="A tájékoztató módosítása" /></div>
          <P>
            Fenntartjuk a jogot a jelen tájékoztató módosítására. Lényeges változásokról e-mailben
            értesítjük a regisztrált felhasználókat, és az oldalon feltüntetjük az új hatályba lépési dátumot.
            A platform folyamatos használata a módosítások elfogadásának minősül.
          </P>
          <P>
            Adatvédelmi kérdésekkel forduljon hozzánk:{" "}
            <a href={`mailto:${CONTROLLER_EMAIL}`} className="font-medium text-brand-600 hover:underline">
              {CONTROLLER_EMAIL}
            </a>
          </P>

          <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            Utolsó frissítés: {EFFECTIVE_DATE} &nbsp;·&nbsp;{" "}
            <Link href="/aszf" className="hover:text-brand-500">ÁSZF</Link>
            {" "}&nbsp;·&nbsp;{" "}
            <Link href="/kapcsolat" className="hover:text-brand-500">Kapcsolat</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
