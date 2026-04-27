export default function DashboardLoading() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card h-28 animate-pulse rounded-2xl border p-4" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="surface-card h-72 animate-pulse rounded-2xl border xl:col-span-2" />
        <div className="surface-card h-72 animate-pulse rounded-2xl border" />
      </div>

      <div className="surface-card h-64 animate-pulse rounded-2xl border" />
    </section>
  );
}
