import LeadForm from "@/components/LeadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-hero-glow">
      <header className="px-6 md:px-10 lg:px-16 py-6 flex items-center justify-between max-w-6xl mx-auto">
        <div className="text-sm font-semibold tracking-[0.2em] text-slate-500">GMC SCANNER FOR E-COMMERCE</div>
        <a href="/api/auth/signin" className="text-sm font-semibold text-ink">
          Sign in
        </a>
      </header>
      <section className="section max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-slate-500">
            E-COMMERCE COMPLIANCE AUDITS
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-ink">
            Keep your e-commerce store live on Google Merchant Center.
          </h1>
          <p className="text-lg text-slate-600 max-w-xl">
            Scan product pages, supplier signals, and policy coverage. Get a compliance score, top risks, and a
            Google Sheet report in minutes.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              "Quick scan 25 product pages",
              "Supplier risk signals (Temu/AliExpress)",
              "Policy coverage checks for GMC",
            ].map((item) => (
              <div key={item} className="card p-4 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <LeadForm />
          <div className="card p-6 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Free E-commerce Quick Scan</span>
              <span className="text-sand font-semibold">0 EUR</span>
            </div>
            <ul className="mt-4 space-y-2">
              <li>Compliance score 0-100</li>
              <li>Top 10 compliance risks</li>
              <li>Google Sheet export</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section max-w-6xl mx-auto">
        <div className="card p-8 grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-display text-xl">Policy coverage</h3>
            <p className="text-sm text-slate-600 mt-2">
              Shipping, returns, contact, privacy, terms. GMC flags missing pages fast.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">Supplier signals</h3>
            <p className="text-sm text-slate-600 mt-2">
              JSON-LD, price, availability, image quality, supplier keywords, and brand gaps.
            </p>
          </div>
          <div>
            <h3 className="font-display text-xl">Export-ready</h3>
            <p className="text-sm text-slate-600 mt-2">
              Sheets and HTML summaries you can share with suppliers or VAs.
            </p>
          </div>
        </div>
      </section>
      <footer className="px-6 md:px-10 lg:px-16 pb-10 text-sm text-slate-500 flex flex-wrap gap-4 justify-between max-w-6xl mx-auto">
        <span>© {new Date().getFullYear()} GMC Compliance Scanner</span>
        <div className="flex gap-4">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
      </footer>
    </main>
  );
}
