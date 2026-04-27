const STATS = [
  { label: "Qualified Leads", value: "8,240", trend: "+18.4%" },
  { label: "Campaign Conversion", value: "14.2%", trend: "+2.1%" },
  { label: "Pipeline Value", value: "$126,400", trend: "+9.7%" },
  { label: "Active Workflows", value: "27", trend: "+5" },
];

const FUNNEL = [
  { stage: "Visitors", count: 18200, width: "100%" },
  { stage: "Captured Leads", count: 8240, width: "74%" },
  { stage: "Qualified", count: 3420, width: "56%" },
  { stage: "Opportunities", count: 1120, width: "40%" },
  { stage: "Won", count: 380, width: "28%" },
];

const CHANNEL_SPLIT = [
  { source: "Google Maps", value: 48 },
  { source: "Instagram", value: 28 },
  { source: "Referrals", value: 14 },
  { source: "Website Forms", value: 10 },
];

const WEEKLY = [32, 42, 38, 57, 49, 66, 71];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATS.map((item) => (
          <article key={item.label} className="surface-card rounded-2xl border p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-main">{item.value}</p>
            <p className="mt-1 text-sm font-medium text-emerald-400">{item.trend} vs last month</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <article className="surface-card rounded-2xl border p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-main">Weekly Lead Momentum</h2>
              <p className="mt-1 text-sm text-muted">Incoming leads over the last 7 days.</p>
            </div>
            <span className="rounded-lg bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">+24% growth</span>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3 rounded-xl border border-soft p-4">
            {WEEKLY.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-violet-700 to-violet-400"
                  style={{ height: `${value}%` }}
                />
                <span className="text-xs text-muted">D{index + 1}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card rounded-2xl border p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-main">Source Distribution</h2>
          <p className="mt-1 text-sm text-muted">Where new leads are coming from.</p>
          <div className="mt-5 space-y-4">
            {CHANNEL_SPLIT.map((item) => (
              <div key={item.source} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">{item.source}</span>
                  <span className="font-medium text-main">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-300/30">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-main">Conversion Funnel</h2>
        <p className="mt-1 text-sm text-muted">Track progression from first touch to closed won deals.</p>
        <div className="mt-5 space-y-3">
          {FUNNEL.map((step) => (
            <div key={step.stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-main">{step.stage}</span>
                <span className="text-muted">{step.count.toLocaleString()}</span>
              </div>
              <div className="h-9 rounded-xl bg-slate-300/25 p-1">
                <div
                  className="flex h-full items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-3 text-xs font-medium text-white"
                  style={{ width: step.width }}
                >
                  {Math.round((step.count / FUNNEL[0].count) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
