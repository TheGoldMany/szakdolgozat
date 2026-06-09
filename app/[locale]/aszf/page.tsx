import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { FileText, AlertTriangle, CreditCard, Users, ShieldCheck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Általános Szerződési Feltételek",
  description: "Az ÁllatiMenhelyek.hu általános szerződési feltételei",
};

const EFFECTIVE_DATE = "2024. január 1.";
const PLATFORM_NAME = "ÁllatiMenhelyek.hu";
const CONTACT_EMAIL = "info@allatimenhelyek.hu";

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

function UL({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm leading-7 text-gray-600">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function OL({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ol className="mt-3 space-y-2 text-sm leading-7 text-gray-600">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <span>{children}</span>
    </div>
  );
}

export default function ASZFPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
              <FileText className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Jogi dokumentum</p>
              <h1 className="text-3xl font-bold text-gray-900">Általános Szerződési Feltételek</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Hatályos: <strong>{EFFECTIVE_DATE}</strong> &nbsp;·&nbsp; Platform: <strong>{PLATFORM_NAME}</strong>
          </p>

          {/* TOC */}
          <nav className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Tartalom</p>
            <ol className="space-y-1.5 text-sm text-brand-600">
              {[
                "Általános rendelkezések",
                "A platform szolgáltatásai",
                "Regisztráció és fiókkezelés",
                "Örökbefogadási folyamat",
                "Adományozás és előfizetések",
                "Tartalom és felhasználói magatartás",
                "Menhelyek felelőssége",
                "A platform felelőssége és korlátozásai",
                "Szellemi tulajdon",
                "A szerződés megszűnése",
                "A feltételek módosítása",
                "Irányadó jog és joghatóság",
              ].map((title, i) => (
                <li key={i}>
                  <a href={`#s${i + 1}`} className="hover:underline">
                    {i + 1}. {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm sm:px-10">

          <P>
            Kérjük, olvassa el figyelmesen jelen Általános Szerződési Feltételeket (ÁSZF), mielőtt
            az <strong>{PLATFORM_NAME}</strong> platformot (a továbbiakban: „Platform") igénybe veszi.
            A platform regisztrálásával, vagy a szolgáltatások bármilyen formában történő igénybevételével
            Ön elfogadja a jelen ÁSZF-ben foglalt feltételeket.
          </P>

          {/* 1 */}
          <div id="s1"><SectionHeading number="1" title="Általános rendelkezések" /></div>

          <SubHeading title="1.1 Felek" />
          <P>
            Jelen ÁSZF a <strong>{PLATFORM_NAME}</strong> (a továbbiakban: „Üzemeltető", „mi") és a platformot
            igénybe vevő természetes vagy jogi személy (a továbbiakban: „Felhasználó") között jön létre.
          </P>

          <SubHeading title="1.2 A feltételek elfogadása" />
          <P>
            A platform regisztrációjával, belépéssel vagy bármilyen funkciónak a bejelentkezés nélküli
            böngészéssel történő igénybevételével Ön megerősíti, hogy:
          </P>
          <UL items={[
            "legalább 18 éves, vagy törvényes képviselőjének beleegyezésével jár el;",
            "elolvasta és elfogadja jelen ÁSZF-et és az Adatvédelmi tájékoztatót;",
            "az általa megadott adatok valósak és naprakészek.",
          ]} />

          <SubHeading title="1.3 TESZTÜZEMELÉSI megjegyzés" />
          <WarnBox>
            A platform jelenleg tesztüzemelési fázisban van. Az adatok nem valósak, a tranzakciók és
            örökbefogadási kérelmek kizárólag tesztelési célt szolgálnak. Éles működés megkezdésekor
            erről külön értesítést küldünk.
          </WarnBox>

          {/* 2 */}
          <div id="s2"><SectionHeading number="2" title="A platform szolgáltatásai" /></div>
          <P>
            Az <strong>{PLATFORM_NAME}</strong> egy közvetítő digitális platform, amely összeköti az
            örökbefogadásra váró állatokat gondozó menhelyeket az örökbefogadni kívánó személyekkel.
            A platform az alábbi főbb szolgáltatásokat nyújtja:
          </P>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { Icon: Users,     title: "Örökbefogadás",        desc: "Állatok böngészése, szűrése, örökbefogadási kérelem benyújtása menhelyeknek." },
              { Icon: ShieldCheck, title: "Bejelentések",       desc: "Elveszett, megtalált és kóbor állatok bejelentése interaktív térképpel." },
              { Icon: CreditCard, title: "Adományozás",         desc: "Egyszeri adományok és havi előfizetések menhelyek támogatására kampányokon keresztül." },
              { Icon: FileText,  title: "Önkéntesség & befogadás", desc: "Önkéntesi jelentkezés és ideiglenes befogadói profil létrehozása menhelyeknél." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
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
            Az üzemeltető a platformot „jelenlegi állapotában" (as-is) biztosítja, és fenntartja a jogot
            a funkciók megváltoztatására, bővítésére vagy megszüntetésére.
          </P>

          {/* 3 */}
          <div id="s3"><SectionHeading number="3" title="Regisztráció és fiókkezelés" /></div>

          <SubHeading title="3.1 Fiók létrehozása" />
          <P>
            Regisztrációhoz érvényes e-mail-cím és jelszó (vagy Google OAuth) szükséges. Minden
            e-mail-cím csak egy fiókhoz társítható. Hamis, mások nevében vagy jogosulatlanul létrehozott
            fiókok törlésre kerülnek.
          </P>

          <SubHeading title="3.2 Fiókbiztonság" />
          <P>
            A jelszó titokban tartásáért és a fiókban végrehajtott tevékenységekért a felhasználó
            felelős. Gyanús fiókhasználat esetén azonnal értesítse az üzemeltetőt.
          </P>

          <SubHeading title="3.3 E-mail-visszaigazolás" />
          <P>
            Egyes funkciók (pl. örökbefogadási kérelem benyújtása) az e-mail-cím visszaigazolásához
            kötöttek. A visszaigazoló e-mail 24 óráig érvényes.
          </P>

          <SubHeading title="3.4 Fiók deaktiválása és törlése" />
          <P>
            A felhasználó bármikor törölheti fiókját a Profil beállításain keresztül. A törlés
            visszavonhatatlan és 30 napot vesz igénybe. A törlés nem érinti a számviteli
            jogszabályok hatálya alá eső pénzügyi adatokat.
          </P>

          {/* 4 */}
          <div id="s4"><SectionHeading number="4" title="Örökbefogadási folyamat" /></div>

          <SubHeading title="4.1 A platform szerepe" />
          <WarnBox>
            Az <strong>{PLATFORM_NAME}</strong> kizárólag közvetítőként jár el. Az örökbefogadásról,
            az állat odaítéléséről és az örökbefogadási feltételek meghatározásáról kizárólag az érintett
            menhely dönt. A platform nem garantálja az örökbefogadás sikerességét.
          </WarnBox>

          <SubHeading title="4.2 Kérelem benyújtása" />
          <OL items={[
            "A felhasználó kiválaszt egy örökbefogadható állatot és kitölti a menhely egyedi kérdőívét.",
            "A kérelem beküldése után a menhely adminisztrátora elbírálja azt (elfogadás / elutasítás / függőben).",
            "A menhely időpontot foglalhat le az ismerkedési látogatáshoz.",
            "Elfogadás esetén utánkövetési folyamat indul az örökbefogadást követő időszakra.",
          ]} />

          <SubHeading title="4.3 Kérelem adatai" />
          <P>
            A kérdőíven megadott adatokat az érintett menhely adatkezelőként kezeli; a platformra
            azok csak tárolási célból kerülnek. A felhasználó felelős a valós adatok megadásáért.
          </P>

          {/* 5 */}
          <div id="s5"><SectionHeading number="5" title="Adományozás és előfizetések" /></div>

          <SubHeading title="5.1 Fizetés" />
          <P>
            Minden fizetést a <strong>Stripe, Inc.</strong> biztonságos fizetési platformon keresztül
            dolgozunk fel. Az {PLATFORM_NAME} nem tárol bankkártya-adatokat.
          </P>

          <SubHeading title="5.2 Egyszeri adományok" />
          <P>
            Az egyszeri adományok visszatérítésmentes önkéntes juttatások; kizárólag technikai hiba
            esetén kérhető visszatérítés a {CONTACT_EMAIL} e-mail-címen 5 munkanapon belül.
          </P>

          <SubHeading title="5.3 Havi előfizetések" />
          <UL items={[
            "Az előfizetés minden hónapban automatikusan megújul.",
            "Lemondás bármikor lehetséges a Profil → Előfizetéseim menüponton keresztül.",
            "A lemondás a következő számlázási ciklus elejétől hatályos; az aktuális időszakra már befizetett összeg nem kerül visszatérítésre.",
            "Az üzemeltető fenntartja a jogot az előfizetési díjak módosítására, amelyről 30 nappal előre értesíti az érintetteket.",
          ]} />

          <SubHeading title="5.4 Adományozási kampányok" />
          <P>
            Felhasználók és menhelyek adományozási kampányokat indíthatnak. A kampányok elérési
            összege cél, nem garancia. Ha egy kampány nem éri el célját, a befolyt összeg a
            kampányhoz kötött menhelyet illeti meg (visszatérítés nem lehetséges).
          </P>

          {/* 6 */}
          <div id="s6"><SectionHeading number="6" title="Tartalom és felhasználói magatartás" /></div>

          <SubHeading title="6.1 Megengedett tartalom" />
          <P>A platformon közzétett tartalmak (profilok, értékelések, üzenetek, bejelentések) valósak,
            nem megtévesztők és nem sértik harmadik felek jogait.
          </P>

          <SubHeading title="6.2 Tiltott magatartás" />
          <P>Tilos különösen:</P>
          <UL items={[
            "Hamis örökbefogadási kérelmek benyújtása vagy hamis adatok megadása.",
            "Más felhasználó, menhely vagy állat nevében eljárni.",
            "Zaklatás, fenyegetés, gyűlöletkeltő tartalom közzététele.",
            "A platform automatizált eszközzel való túlterhelése (DoS, scraping).",
            "Jogsértő tartalom (szerzői jog, személyiségi jog megsértése) feltöltése.",
            "Állatokkal kapcsolatos kegyetlen, kizsákmányoló vagy illegális tevékenység promóciója.",
          ]} />

          <SubHeading title="6.3 Értékelések" />
          <P>
            Értékelést csak olyan felhasználó adhat, aki valódi örökbefogadási kérelemmel rendelkezik
            az adott menhelynél. Az értékelések valós tapasztalaton kell alapuljanak. A félrevezető
            vagy jogsértő értékelések eltávolíthatók.
          </P>

          {/* 7 */}
          <div id="s7"><SectionHeading number="7" title="Menhelyek felelőssége" /></div>
          <P>
            A platformon regisztrált menhelyek önállóan felelnek:
          </P>
          <UL items={[
            "az állatokról közzétett adatok és képek valóságtartalmáért;",
            "az örökbefogadási döntések jogszerűségéért és szakszerűségéért;",
            "az örökbefogadási kérdőíven gyűjtött személyes adatok GDPR-konform kezeléséért;",
            "az általuk szervezett események, önkéntes programok és befogadói programok lebonyolításáért;",
            "a Stripe Connect keretében kezelt pénzügyi adatok és kifizetések szabályszerűségéért.",
          ]} />
          <P>
            A menhely elfogadja, hogy a platformon regisztrált állatok és információk nyilvánosan
            elérhetők. Törvénybe ütköző vagy etikátlan állattartási tevékenység azonnali felfüggesztést
            von maga után.
          </P>

          {/* 8 */}
          <div id="s8"><SectionHeading number="8" title="A platform felelőssége és korlátozásai" /></div>

          <SubHeading title="8.1 Közvetítői szerep" />
          <P>
            Az üzemeltető közvetítőként jár el és nem vállal felelősséget az örökbefogadás
            kimenetelééért, a menhelyek által közölt adatok pontosságáért, az állatok egészségügyi
            állapotáért, sem a felhasználók egymás közötti kommunikációjáért.
          </P>

          <SubHeading title="8.2 Felelősségkorlátozás" />
          <P>
            A vonatkozó jogszabályok által megengedett mértékig az üzemeltető nem vállal felelősséget:
          </P>
          <UL items={[
            "a platform ideiglenes elérhetetlenségéért vagy technikai hibákért;",
            "harmadik fél (menhely, Stripe, Google stb.) szolgáltatásának meghibásodásáért;",
            "felhasználók által közzétett tartalmakért;",
            "az örökbefogadást követően az állat viselkedéséből vagy egészségéből eredő károkért.",
          ]} />

          <SubHeading title="8.3 Szolgáltatás elérhetősége" />
          <P>
            Az üzemeltető törekszik a platform folyamatos elérhetőségére, de nem garantál 100%-os
            rendelkezésre állást. Karbantartási munkálatokról előzetesen értesítünk.
          </P>

          {/* 9 */}
          <div id="s9"><SectionHeading number="9" title="Szellemi tulajdon" /></div>
          <P>
            A platform neve, logója, forráskódja, arculata és saját tartalmai az üzemeltető kizárólagos
            szellemi tulajdonát képezik. A felhasználók által feltöltött tartalmak (pl. állatok képei)
            vonatkozásában a feltöltő biztosítja, hogy jogosult azok közzétételére, és korlátlan,
            visszavonhatatlan licencet ad az üzemeltetőnek azok platformon való megjelenítésére.
          </P>

          {/* 10 */}
          <div id="s10"><SectionHeading number="10" title="A szerződés megszűnése" /></div>
          <P>Az üzemeltetőnek joga van figyelmeztetés nélkül felfüggeszteni vagy törölni a fiókot, ha:</P>
          <UL items={[
            "a felhasználó megsérti jelen ÁSZF bármely rendelkezését;",
            "a fiókkal visszaélés, csalás vagy jogsértés gyanúja merül fel;",
            "bíróság vagy hatóság ilyen tartalmú döntést hoz.",
          ]} />
          <P>
            A felhasználó a fióktörlés után elveszíti hozzáférését az összes adathoz és korábbi
            kérelméhez, az adatmegőrzési szabályok által megkövetelt adatok kivételével.
          </P>

          {/* 11 */}
          <div id="s11"><SectionHeading number="11" title="A feltételek módosítása" /></div>
          <P>
            Az üzemeltető jogosult jelen ÁSZF módosítására. Lényeges változásokról a regisztrált
            felhasználókat legalább 15 nappal előre e-mailben értesítjük. Az értesítés elküldése
            utáni folyamatos platformhasználat a módosított feltételek elfogadásának minősül.
            Ha nem ért egyet a változásokkal, kérjük, törölje fiókját a hatályba lépés előtt.
          </P>

          {/* 12 */}
          <div id="s12"><SectionHeading number="12" title="Irányadó jog és joghatóság" /></div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <div className="text-sm text-gray-600">
              <p className="font-semibold text-gray-800">Magyar jog irányadó</p>
              <p className="mt-1">
                Jelen ÁSZF-re és az abból eredő jogvitákra a <strong>magyar jog</strong> irányadó,
                különösen a Polgári Törvénykönyvről szóló 2013. évi V. törvény (Ptk.),
                az elektronikus kereskedelemről szóló 2001. évi CVIII. törvény (Eker. tv.) és
                a fogyasztóvédelemről szóló 1997. évi CLV. törvény.
              </p>
              <p className="mt-2">
                Felek elsősorban békés úton rendezik vitáikat. Ennek sikertelensége esetén a
                hatáskörrel és illetékességgel rendelkező magyar bíróság jár el.
                Fogyasztók az Online Vitarendezési Platformot (ODR) is igénybe vehetik:{" "}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
                  className="text-brand-600 hover:underline font-medium">ec.europa.eu/consumers/odr</a>
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            Utolsó frissítés: {EFFECTIVE_DATE} &nbsp;·&nbsp;{" "}
            <Link href="/adatvedelem" className="hover:text-brand-500">Adatvédelmi tájékoztató</Link>
            {" "}&nbsp;·&nbsp;{" "}
            <Link href="/kapcsolat" className="hover:text-brand-500">Kapcsolat</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
