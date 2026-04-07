import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Találd meg új{" "}
          <span className="text-brand-500">legjobb barátodat</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Böngéssz örökbefogadható állatok között magyarországi menhelyekről.
          Adj otthont egy rászoruló állatnak még ma!
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/animals"
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
          >
            Állatok böngészése
          </Link>
          <Link
            href="/shelters"
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Menhelyek
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { label: "Elérhető állat", value: "1 200+" },
            { label: "Partner menhely", value: "85+" },
            { label: "Sikeres örökbefogadás", value: "4 500+" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm"
            >
              <p className="text-4xl font-bold text-brand-500">{stat.value}</p>
              <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
