import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomeRoute } from "../../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const getLoginErrorMessage = (requestError) => {
  if (requestError.response?.data?.message) {
    return requestError.response.data.message;
  }

  if (requestError.code === "ERR_NETWORK") {
    return `Unable to reach the backend at ${API_URL}. If backend is already running, this is usually an API URL/CORS mismatch (localhost vs 127.0.0.1/LAN IP).`;
  }

  return "Unable to sign in.";
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const [form, setForm] = useState({ register_number: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getHomeRoute(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loggedInUser = await login({
        register_number: form.register_number,
        password: form.password,
      });

      navigate(getHomeRoute(loggedInUser.role), { replace: true });
    } catch (requestError) {
      setError(getLoginErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr,0.85fr]">
      <section className="grid-pattern hidden border-r border-white/10 bg-black/10 p-8 lg:flex lg:flex-col lg:justify-between">
        <div>
          <span className="badge border-copper-400/30 bg-copper-400/10 text-copper-300">
            Department of Electronics Engineering
          </span>
          <h1 className="mt-6 max-w-xl font-display text-6xl font-semibold leading-tight text-white">
            VLSI Lab Register System
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Replace the paper register with QR-driven seat booking, realtime occupancy, and creator-managed system mapping.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-cyanlab-300">Student</p>
            <p className="mt-3 text-sm text-slate-300">Book one lab system and track your usage history.</p>
          </div>
          <div className="panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-copper-300">Admin</p>
            <p className="mt-3 text-sm text-slate-300">Monitor live occupancy, block systems, and manage maintenance windows.</p>
          </div>
          <div className="panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-moss-300">Creator</p>
            <p className="mt-3 text-sm text-slate-300">Manage student accounts, map device IPs, and simulate concurrency scenarios.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md panel-surface p-8">
          <span className="badge border-cyanlab-400/30 bg-cyanlab-400/10 text-cyanlab-300">
            Secure Login
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold text-white">
            Sign in to continue
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Students, admins, and creators all authenticate here.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="register_number">
                Register Number
              </label>
              <input
                id="register_number"
                name="register_number"
                className="input-base"
                placeholder="EE2024001"
                value={form.register_number}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input-base"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Entry flow</p>
            <p className="mt-2">1. Scan QR and login.</p>
            <p>2. Book a Linux or Windows system.</p>
            <p>3. Start your session within the booked time window.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
