const USERS = [
  { name: "Ava Thompson", email: "ava@joycrm.com", role: "Admin", status: "Active", lastSeen: "2 min ago" },
  { name: "Noah Patel", email: "noah@joycrm.com", role: "Sales Manager", status: "Active", lastSeen: "14 min ago" },
  { name: "Mia Johnson", email: "mia@joycrm.com", role: "SDR", status: "Invited", lastSeen: "Pending invite" },
  { name: "Liam Chen", email: "liam@joycrm.com", role: "Operations", status: "Active", lastSeen: "1 hour ago" },
  { name: "Sophia Davis", email: "sophia@joycrm.com", role: "Analyst", status: "Inactive", lastSeen: "3 days ago" },
];

export default function UsersPage() {
  return (
    <section className="space-y-6">
      <article className="surface-card rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-main">Users</h2>
            <p className="mt-1 text-sm text-muted">Manage team members, roles, and account status.</p>
          </div>
          <button type="button" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Invite User
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Total Users</p>
            <p className="mt-2 text-2xl font-semibold text-main">24</p>
          </div>
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Pending Invites</p>
            <p className="mt-2 text-2xl font-semibold text-main">3</p>
          </div>
          <div className="surface-muted rounded-xl border border-soft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Admins</p>
            <p className="mt-2 text-2xl font-semibold text-main">2</p>
          </div>
        </div>
      </article>

      <article className="surface-card overflow-x-auto rounded-2xl border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="surface-muted">
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Seen</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((user) => (
              <tr key={user.email} className="border-t border-soft text-main">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-muted">{user.email}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.status === "Active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : user.status === "Invited"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{user.lastSeen}</td>
                <td className="px-4 py-3">
                  <button type="button" className="rounded-md border border-soft px-3 py-1.5 text-xs font-medium text-muted">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
