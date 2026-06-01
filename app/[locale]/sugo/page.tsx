import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  PawPrint, Search, FileText, Heart, Bell, Building2,
  CreditCard, Upload, MessageCircle, ChevronRight, Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Útmutató",
  description: "Hogyan működik az ÁllatiMenhelyek.hu platform – lépésről lépésre.",
};

function Section({ id, icon: Icon, title, color, children }: {
  id:       string;
  icon:     React.ElementType;
  title:    string;
  color:    string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className={`mb-6 flex items-center gap-3 rounded-2xl ${color} px-6 py-4`}>
        <Icon className="h-6 w-6 shrink-0" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4 px-1">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
        {n}
      </div>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, href }: { icon: React.ElementType; title: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}

const TOC = [
  { id: "orokbefogadas", label: "Örökbefogadás menete",    icon: PawPrint   },
  { id: "kerelem",       label: "Kérelem küldése",          icon: FileText   },
  { id: "bejelentes",    label: "Kóbor állat bejelentése",  icon: Bell       },
  { id: "adomanyozas",   label: "Adományozás és előfizetés", icon: Heart     },
  { id: "uzenetek",      label: "Üzenetváltás",             icon: MessageCircle },
  { id: "menhely",       label: "Menhelyeknek",             icon: Building2  },
  { id: "iratok",        label: "Iratok és dokumentumok",   icon: Upload     },
  { id: "fizetes",       label: "Fizetési beállítások",     icon: CreditCard },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Útmutató</h1>
          <p className="mt-3 text-lg text-gray-500">
            Minden, amit az ÁllatiMenhelyek.hu használatához tudni kell.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">

          {/* Sidebar TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Tartalom</p>
              <nav className="space-y-1">
                {TOC.map(({ id, label, icon: Icon }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-12 lg:col-span-3">

            {/* Örökbefogadás */}
            <Section id="orokbefogadas" icon={PawPrint} title="Örökbefogadás menete" color="bg-brand-50 text-brand-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                Az örökbefogadás egy egyszerű, átlátható folyamat. Az alábbi lépéseket kell követned:
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Böngéssz az állatok között">
                  Látogass el az <strong>Állatok</strong> oldalra és szűrj faj, méret, kor vagy
                  helyszín alapján. Minden állatnál megtalálod a részletes leírást, fotókat és
                  egészségügyi információkat (oltott, ivartalanított, mikrochipes).
                </Step>
                <Step n={2} title="Nézd meg a menhely oldalát">
                  Az állat profilján megtalálod, melyik menhelyhez tartozik. A menhely oldalán
                  megtudhatod az örökbefogadási feltételeket és az esetleges dokumentumokat.
                </Step>
                <Step n={3} title="Regisztrálj vagy jelentkezz be">
                  Kérelem küldéséhez szükséges egy fiók. A regisztráció ingyenes – e-mail cím
                  és jelszó, vagy Google/Facebook bejelentkezés.
                </Step>
                <Step n={4} title="Küldj örökbefogadási kérelmet">
                  Az állat oldalán kattints az <strong>„Örökbefogadási kérelem"</strong> gombra,
                  töltsd ki az adatlapot, és küldd el. A menhely e-mailben kap értesítést.
                </Step>
                <Step n={5} title="Várd meg a visszajelzést">
                  A kérelem állapotát a <strong>Kérelmeimben</strong> követheted nyomon. A menhely
                  jóváhagyás vagy elutasítás esetén e-mailben értesít.
                </Step>
                <Step n={6} title="Átvétel">
                  Jóváhagyott kérelem után a menhely felveszi veled a kapcsolatot az állat
                  átadásának megszervezéséhez.
                </Step>
              </div>
              <div className="mt-6 rounded-xl bg-brand-50 border border-brand-100 p-4 text-sm text-brand-800">
                <strong>Tipp:</strong> Üzenj a menhelynek az üzenetrendszeren keresztül,
                ha kérdésed van az állat kapcsán, még kérelem beadása előtt.
              </div>
            </Section>

            {/* Kérelem */}
            <Section id="kerelem" icon={FileText} title="Kérelem küldése és kezelése" color="bg-blue-50 text-blue-800">
              <div className="space-y-5">
                <Step n={1} title="Kérelem beadása">
                  Az állat profilján töltsd ki az örökbefogadási adatlapot: lakókörülmények,
                  tapasztalat állatokkal, háztartás összetétele. Minél részletesebb, annál
                  nagyobb az esélyünk.
                </Step>
                <Step n={2} title="Kérelem nyomon követése">
                  A <Link href="/applications" className="text-blue-600 hover:underline">Kérelmeimben</Link> látod
                  az összes benyújtott kérelmed és azok státuszát:
                  <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Folyamatban</span>,
                  <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Jóváhagyva</span>,
                  <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Elutasítva</span>.
                </Step>
                <Step n={3} title="Kérelem visszavonása">
                  Amíg a kérelem <em>Folyamatban</em> státuszban van, vissza lehet vonni
                  a Kérelmeim oldalon.
                </Step>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card icon={FileText} title="Kérelmeim" href="/applications" />
                <Card icon={Search}   title="Állatok böngészése" href="/animals" />
              </div>
            </Section>

            {/* Bejelentés */}
            <Section id="bejelentes" icon={Bell} title="Kóbor állat bejelentése" color="bg-orange-50 text-orange-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                Ha elveszett, talált vagy veszélyeztetett állatot látsz, tegyél bejelentést –
                regisztráció nélkül is!
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Menj a Bejelentések oldalra">
                  Kattints a <Link href="/reports" className="text-orange-600 hover:underline">Bejelentések</Link> menüpontra
                  a fejlécben.
                </Step>
                <Step n={2} title="Töltsd ki az adatlapot">
                  Adj meg annyit amennyit tudsz: helyszín, leírás, fénykép. A pontos helyszín
                  megjelölése sokat segít a megtalálásban.
                </Step>
                <Step n={3} title="Fénykép feltöltése">
                  Tölts fel fotót az állatról – ez jelentősen növeli a megtalálás esélyét.
                </Step>
                <Step n={4} title="Üzenetváltás">
                  Ha valaki ráismer az állatodra, üzenetet küldhet a bejelentésedre.
                  E-mailben értesítünk.
                </Step>
              </div>
            </Section>

            {/* Adományozás */}
            <Section id="adomanyozas" icon={Heart} title="Adományozás és előfizetés" color="bg-pink-50 text-pink-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                A menhelyeket egyszeri adománnyal vagy havi előfizetéssel is támogathatod.
                A fizetés biztonságos Stripe-on keresztül történik.
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Egyszeri adomány – Kampányok">
                  A <Link href="/donate" className="text-pink-600 hover:underline">Támogatás</Link> oldalon
                  böngészheted az aktív kampányokat. Válassz egyet, add meg az összeget
                  (minimum 175 Ft), és fizess bankkártyával. Az adomány közvetlenül a
                  menhelyhez kerül (4% platform díj levonásával).
                </Step>
                <Step n={2} title="Havi előfizetés – Csomagok">
                  A menhelyek oldalán előfizetési csomagokat találsz. Egy csomag kiválasztásával
                  havonta automatikusan levonásra kerül az összeg. Az előfizetést bármikor
                  lemondhatod a <Link href="/profile" className="text-pink-600 hover:underline">Profilodban</Link>.
                </Step>
                <Step n={3} title="Előfizetés lemondása">
                  Profil → Előfizetéseim → Lemondás gomb. A már kifizetett időszak végéig
                  az előfizetés aktív marad, utána automatikusan megszűnik.
                </Step>
              </div>
              <div className="mt-5 rounded-xl bg-pink-50 border border-pink-100 p-4 text-sm text-pink-800">
                <strong>Biztonság:</strong> Minden fizetés a Stripe biztonságos fizetési
                rendszerén keresztül zajlik. Kártyaadataidat soha nem tároljuk.
              </div>
            </Section>

            {/* Üzenetek */}
            <Section id="uzenetek" icon={MessageCircle} title="Üzenetváltás" color="bg-purple-50 text-purple-800">
              <div className="space-y-5">
                <Step n={1} title="Üzenet küldése menhelynek">
                  Az állat profilján, az örökbefogadási kérelem gomb mellett lehetőség van
                  üzenetet küldeni a menhelynek. Kérdések, egyeztetések intézhetők itt.
                </Step>
                <Step n={2} title="Értesítések">
                  Új üzenetnél e-mailt kapsz értesítőt. Az olvasatlan üzenetek száma
                  megjelenik a fejlécben az üzenet ikon mellett.
                </Step>
                <Step n={3} title="Üzenetek megtekintése">
                  Az összes beszélgetés a <Link href="/messages" className="text-purple-600 hover:underline">Üzeneteim</Link> oldalon
                  található.
                </Step>
              </div>
            </Section>

            {/* Menhelyeknek */}
            <Section id="menhely" icon={Building2} title="Menhelyeknek – Admin felület" color="bg-emerald-50 text-emerald-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                Ha te vagy a menhely üzemeltetője, a következő funkciók állnak rendelkezésre
                az admin dashboardon.
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Regisztráció és hozzáférés">
                  Regisztrálj a platformra, majd kérj SHELTER_ADMIN jogosultságot a menhelyedhez
                  a főadmintól. Bejelentkezés után az <strong>Admin felület</strong> link
                  jelenik meg a profilmenüdben.
                </Step>
                <Step n={2} title="Állatok hozzáadása">
                  Dashboard → Állatok → <em>„Állat hozzáadása"</em> gomb. Töltsd ki az adatokat,
                  tölts fel fotókat (max. 6), és az állat azonnal megjelenik a listán.
                </Step>
                <Step n={3} title="Kérelmek kezelése">
                  Dashboard → Kérelmek. Minden beérkező kérelmet itt látsz. Jóváhagyhatod,
                  elutasíthatod vagy „Folyamatban" státuszba helyezheted. Az örökbefogadónak
                  minden státuszváltásról e-mail értesítés megy.
                </Step>
                <Step n={4} title="Előfizetési csomagok">
                  Dashboard → Előfizetések → csomag hozzáadása (minimum 175 Ft/hó).
                  A támogatók havi rendszerességgel fizetnek a csomagért.
                </Step>
                <Step n={5} title="Menhely beállításai">
                  Dashboard → Menhely beállítás: profilkép, leírás, cím, telefonszám,
                  weboldal és Stripe Connect beállítás.
                </Step>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card icon={Building2} title="Admin dashboard"  href="/dashboard"         />
                <Card icon={Users}     title="Kérelmek"         href="/dashboard/applications" />
              </div>
            </Section>

            {/* Iratok */}
            <Section id="iratok" icon={Upload} title="Iratok és dokumentumok" color="bg-sky-50 text-sky-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                Az állatokhoz feltöltheted az egészségügyi dokumentumokat: oltási könyvet,
                mikrochip igazolást, ivartalanítási dokumentumot stb.
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Dokumentum feltöltése">
                  Dashboard → Állatok → az állat sorában kattints az <strong>„Iratok"</strong> linkre.
                  Az megnyíló oldalon a <em>„Dokumentum feltöltése"</em> gombra kattintva
                  PDF, DOC és DOCX fájlokat tudsz feltölteni (max. 10 MB).
                </Step>
                <Step n={2} title="Dokumentumok kezelése">
                  A feltöltött fájlok listázódnak: látod a nevet, típust, méretet és a feltöltés
                  dátumát. Megnyithatod és törölheted is őket.
                </Step>
              </div>
              <div className="mt-4 rounded-xl bg-sky-50 border border-sky-100 p-4 text-sm text-sky-800">
                <strong>Megjegyzés:</strong> A dokumentumok egyelőre csak az admin számára
                láthatók. A nyilvános megjelenítés a jövőben kerül bevezetésre.
              </div>
            </Section>

            {/* Fizetési beállítások */}
            <Section id="fizetes" icon={CreditCard} title="Stripe Connect – Fizetési beállítások" color="bg-violet-50 text-violet-800">
              <p className="text-sm text-gray-600 leading-relaxed">
                A menhelyek adományokat és előfizetési díjakat fogadhatnak, ha csatlakoztatják
                Stripe fiókjukat. Az összeg automatikusan a menhely bankszámlájára kerül
                (a platform 4% kezelési díjat von le).
              </p>
              <div className="space-y-5 mt-4">
                <Step n={1} title="Stripe Connect aktiválása">
                  Dashboard → Menhely beállítás → <em>„Stripe fiók csatlakoztatása"</em> gomb.
                  Ez megnyitja a Stripe biztonságos onboarding felületét.
                </Step>
                <Step n={2} title="Adatok megadása a Stripe-on">
                  A Stripe felületén add meg a bankszámlaszámot, vállalkozás adatokat és
                  személyazonosságot. Ez egy egyszeri folyamat.
                </Step>
                <Step n={3} title="Visszairányítás és aktiválás">
                  Az onboarding befejezése után visszakerülsz a menhely beállítások oldalára.
                  A <em>„Csatlakoztatva"</em> státusz jelzi, hogy aktív a fizetési kapcsolat.
                </Step>
                <Step n={4} title="Kifizetések">
                  Az adományok és előfizetési díjak automatikusan a te Stripe-fiókodra kerülnek.
                  A kifizetések kezelése a Stripe dashboardon történik.
                </Step>
              </div>
              <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-4 text-sm text-violet-800">
                <strong>Platform díj:</strong> A platform az összeg 4%-át tartja meg a működési
                költségek fedezésére. Például 10 000 Ft adományból 9 600 Ft kerül a menhelyhez.
              </div>
            </Section>

            {/* Contact CTA */}
            <div className="rounded-2xl bg-brand-600 p-8 text-center text-white">
              <h3 className="text-xl font-bold">Nem találtad meg a választ?</h3>
              <p className="mt-2 text-sm text-brand-100">
                Írj nekünk és segítünk!
              </p>
              <a
                href="mailto:info@allatimenhelyek.hu"
                className="mt-4 inline-block rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                info@allatimenhelyek.hu
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
