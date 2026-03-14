import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/AppShell";
import Panel from "../../components/common/Panel";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import SeatLegend from "../../components/seat/SeatLegend";
import SeatGrid from "../../components/seat/SeatGrid";
import AdminCharts from "../../components/charts/AdminCharts";
import ChatBox from "../../components/ChatBox";
import { adminService } from "../../services/adminService";
import { bookingService } from "../../services/bookingService";
import { connectSocket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime, formatDuration } from "../../utils/formatters";

const AdminDashboard = () => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [seatStatus, setSeatStatus] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState("");
  const [reason, setReason] = useState("Maintenance check");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [dashboardData, seatData] = await Promise.all([
      adminService.getDashboard(),
      bookingService.getSeatStatus(),
    ]);

    setDashboard(dashboardData);
    setSeatStatus(seatData);
  };

  useEffect(() => {
    loadData()
      .catch((requestError) => {
        setError(requestError.response?.data?.message || "Unable to load admin dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    const handleSeatStatus = (payload) => setSeatStatus(payload);
    const handleDashboard = (payload) => setDashboard(payload);
    const handleReconnect = async () => {
      try {
        const [dashboardData, seatData] = await Promise.all([
          adminService.getDashboard(),
          bookingService.getSeatStatus(),
        ]);
        setDashboard(dashboardData);
        setSeatStatus(seatData);
      } catch (_error) {
        // Keep current data if refresh fails; next event will sync it.
      }
    };

    socket.on("seat-status-updated", handleSeatStatus);
    socket.on("dashboard-updated", handleDashboard);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("seat-status-updated", handleSeatStatus);
      socket.off("dashboard-updated", handleDashboard);
      socket.off("connect", handleReconnect);
    };
  }, [token]);

  const selectedSeatData = useMemo(
    () => seatStatus?.seats?.find((seat) => seat.seat_id === selectedSeat) || null,
    [seatStatus, selectedSeat],
  );

  const handleToggleMaintenance = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await adminService.toggleMaintenance(!dashboard.maintenance_mode);
      setMessage(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update maintenance mode.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockAction = async () => {
    if (!selectedSeat) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (selectedSeatData?.status === "blocked") {
        await adminService.unblockSystem(selectedSeat);
        setMessage(`${selectedSeat} unblocked.`);
      } else {
        await adminService.blockSystem({ seat_id: selectedSeat, reason });
        setMessage(`${selectedSeat} blocked.`);
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update seat state.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading admin dashboard..." />;
  }

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle="Watch lab occupancy in realtime, block or unblock systems, toggle maintenance windows, and inspect peak usage analytics."
      actions={
        <button type="button" className="btn-primary" onClick={handleToggleMaintenance} disabled={submitting}>
          {dashboard?.maintenance_mode ? "Disable Maintenance" : "Enable Maintenance"}
        </button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:[grid-template-columns:repeat(5,minmax(0,1fr))]">
        <StatCard label="Live Bookings" value={dashboard?.active_bookings?.length || 0} helper="Students currently assigned" tone="red" />
        <StatCard label="Available" value={dashboard?.seat_summary?.available || 0} helper="Ready-to-book systems" tone="green" />
        <StatCard label="Blocked" value={dashboard?.seat_summary?.blocked || 0} helper="Systems under admin lock" tone="amber" />
        <StatCard label="Protected Rows" value={dashboard?.row_reservations?.length || 0} helper="Rows reserved for female students" tone="cyan" />
        <StatCard label="Total Usage" value={formatDuration(dashboard?.analytics?.total_usage_minutes || 0)} helper={`${dashboard?.analytics?.total_sessions || 0} sessions logged`} tone="cyan" />
      </div>

      {message ? <p className="rounded-2xl border border-moss-400/30 bg-moss-400/10 px-4 py-3 text-sm text-moss-200">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel title="Realtime Seat Grid" eyebrow="Operations">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SeatLegend />
            <div className="text-sm text-slate-300">
              Maintenance mode: <span className="font-semibold text-white">{dashboard?.maintenance_mode ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
          {dashboard?.female_seat_protection_enabled ? (
            <p className="mb-4 rounded-2xl border border-pink-400/30 bg-pink-400/10 px-4 py-3 text-sm text-pink-100">
              Pink seats belong to rows temporarily protected for female students.
            </p>
          ) : null}
          <SeatGrid
            sections={seatStatus?.sections || []}
            selectedSeat={selectedSeat}
            onSelect={(seat) => setSelectedSeat(seat.seat_id)}
            selectableStatuses={["available", "booked", "blocked", "female_reserved"]}
          />
        </Panel>

        <Panel title="Seat Control" eyebrow="Block / Unblock">
          <div className="space-y-4">
            <div className="panel-muted p-4">
              <p className="text-sm text-slate-300">Selected system</p>
              <p className="mt-2 font-display text-4xl font-semibold text-white">{selectedSeat || "None"}</p>
              <p className="mt-2 text-sm text-slate-400">
                {selectedSeatData ? `Status: ${selectedSeatData.status}` : "Select a system from the grid to manage it."}
              </p>
              {selectedSeatData?.female_reservation_active ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-pink-200">
                  {selectedSeatData.row_label} is reserved for female students
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="reason">
                Block Reason
              </label>
              <input
                id="reason"
                className="input-base"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Enter a maintenance or issue note"
              />
            </div>

            <button
              type="button"
              className={selectedSeatData?.status === "blocked" ? "btn-secondary w-full" : "btn-primary w-full"}
              onClick={handleBlockAction}
              disabled={submitting || !selectedSeat}
            >
              {selectedSeatData?.status === "blocked" ? "Unblock Selected System" : "Block Selected System"}
            </button>

            <div className="panel-muted p-4 text-sm text-slate-300">
              {selectedSeatData?.status === "booked" ? (
                <>
                  <p className="text-white">Current holder: {selectedSeatData.student_name}</p>
                  <p className="mt-2">Booking window ends at {formatDateTime(selectedSeatData.exit_time)}.</p>
                </>
              ) : (
                <p>Selecting a blocked seat lets you remove the lock. Selecting any other seat lets you apply a maintenance block.</p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Panel title="Row Reservation Status" eyebrow="Female Protection">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Female Bookings</th>
                  <th>Active Seats</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.row_reservations?.length ? (
                  dashboard.row_reservations.map((row) => (
                    <tr key={row.row_id}>
                      <td>{row.row_label}</td>
                      <td>Reserved for female students</td>
                      <td>{row.female_booking_count}</td>
                      <td>{row.active_seats.join(", ")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-slate-400">
                      {dashboard?.female_seat_protection_enabled ? "No rows are currently reserved." : "Girls seat protection is currently disabled by the creator."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Live Lab Usage" eyebrow="Active Sessions">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register Number</th>
                  <th>System</th>
                  <th>Entry Time</th>
                  <th>Exit Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.active_bookings?.length ? (
                  dashboard.active_bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.student_name}</td>
                      <td>{booking.register_number}</td>
                      <td>{booking.seat_id}</td>
                      <td>{formatDateTime(booking.entry_time)}</td>
                      <td>{formatDateTime(booking.exit_time)}</td>
                      <td>{formatDuration(booking.duration_minutes)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-400">
                      No active sessions right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <ChatBox />

      <AdminCharts analytics={dashboard?.analytics} />
    </AppShell>
  );
};

export default AdminDashboard;
