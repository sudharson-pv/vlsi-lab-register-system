import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navigation = {
  student: [{ to: "/student", label: "Student Dashboard" }],
  admin: [{ to: "/admin", label: "Admin Dashboard" }],
  creator: [{ to: "/creator", label: "Creator Panel" }],
};

const AppShell = ({ title, subtitle, actions, children }) => {
  const { user, logout } = useAuth();
  const links = navigation[user?.role] || [];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="panel-surface grid-pattern p-6">
          <div>
            <span className="badge border-copper-400/30 bg-copper-400/10 text-copper-300">
              VLSI Lab Register System
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold text-white">
              Electronics Engineering
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              QR booking, realtime occupancy, and system mapping for VLSI Design & Technology labs.
            </p>
          </div>

          <div className="mt-8 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyanlab-400 text-slate-950"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Signed in as</p>
            <p className="mt-2 font-display text-xl font-semibold text-white">{user?.student_name}</p>
            <p className="mt-1 text-sm text-slate-300">{user?.register_number}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-cyanlab-300">{user?.role}</p>
          </div>

          <button type="button" className="btn-secondary mt-6 w-full" onClick={logout}>
            Sign Out
          </button>
        </aside>

        <main className="space-y-6">
          <section className="panel-surface p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-cyanlab-300">Live Operations</p>
                <h2 className="mt-3 font-display text-3xl font-semibold text-white">{title}</h2>
                {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-300">{subtitle}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
