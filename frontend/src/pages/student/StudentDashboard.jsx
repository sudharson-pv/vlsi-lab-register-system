import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/AppShell";
import Panel from "../../components/common/Panel";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import UsageCalendar from "../../components/common/UsageCalendar";
import SeatLegend from "../../components/seat/SeatLegend";
import SeatGrid from "../../components/seat/SeatGrid";
import ChatBox from "../../components/ChatBox";
import { bookingService } from "../../services/bookingService";
import { connectSocket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import {
  formatDateTime,
  formatDuration,
  toLocalInputValue,
} from "../../utils/formatters";

const getDefaultWindow = () => {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);

  const exit = new Date(rounded);
  exit.setHours(exit.getHours() + 1);

  return {
    entry_time: toLocalInputValue(rounded),
    exit_time: toLocalInputValue(exit),
  };
};

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const defaults = useMemo(() => getDefaultWindow(), []);
  const [seatStatus, setSeatStatus] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    entry_time: defaults.entry_time,
    exit_time: defaults.exit_time,
  });

  const loadDashboard = async () => {
    const [seatData, bookingData] = await Promise.all([
      bookingService.getSeatStatus(),
      bookingService.getStudentBookings(),
    ]);

    setSeatStatus(seatData);
    setStudentData(bookingData);
  };

  useEffect(() => {
    loadDashboard()
      .catch((requestError) => {
        setError(requestError.response?.data?.message || "Unable to load dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    const handleSeatStatus = async (payload) => {
      setSeatStatus(payload);
      try {
        const bookings = await bookingService.getStudentBookings();
        setStudentData(bookings);
      } catch (_error) {
        // Avoid blocking live updates because of a transient fetch error.
      }
    };

    const handleReconnect = async () => {
      try {
        const [seatData, bookingData] = await Promise.all([
          bookingService.getSeatStatus(),
          bookingService.getStudentBookings(),
        ]);
        setSeatStatus(seatData);
        setStudentData(bookingData);
      } catch (_error) {
        // Keep current state if refresh fails; next socket event will retry.
      }
    };

    socket.on("seat-status-updated", handleSeatStatus);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("seat-status-updated", handleSeatStatus);
      socket.off("connect", handleReconnect);
    };
  }, [token]);

  const currentBooking = studentData?.current_booking;
  const selectableStatuses =
    user?.gender === "female"
      ? ["available", "female_reserved"]
      : ["available"];

  const handleBook = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await bookingService.bookSystem({
        seat_id: selectedSeat,
        entry_time: new Date(form.entry_time).toISOString(),
        exit_time: new Date(form.exit_time).toISOString(),
      });

      setMessage(`Booking confirmed for ${response.booking.seat_id}.`);
      setSelectedSeat(response.booking.seat_id);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentBooking) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await bookingService.cancelBooking(currentBooking._id);
      setMessage("Active booking cancelled.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading student dashboard..." />;
  }

  return (
    <AppShell
      title="Student Dashboard"
      subtitle="Book a single active system and monitor your current slot."
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value={seatStatus?.summary?.available ?? 0} helper="Open systems right now" tone="green" />
        <StatCard label="Booked" value={seatStatus?.summary?.booked ?? 0} helper="Currently assigned systems" tone="red" />
        <StatCard label="Blocked" value={seatStatus?.summary?.blocked ?? 0} helper="Maintenance or blocked devices" tone="amber" />
        <StatCard
          label="Current Booking"
          value={currentBooking?.seat_id || "None"}
          helper={currentBooking ? `${formatDateTime(currentBooking.entry_time)} to ${formatDateTime(currentBooking.exit_time)}` : "No active booking"}
          tone="cyan"
        />
      </div>

      {seatStatus?.maintenance_mode ? (
        <Panel title="Maintenance Active" eyebrow="Booking Locked">
          <p className="text-sm text-slate-300">
            New bookings are temporarily disabled by the admin. Existing active sessions remain visible below.
          </p>
        </Panel>
      ) : null}

      {message ? <p className="rounded-2xl border border-moss-400/30 bg-moss-400/10 px-4 py-3 text-sm text-moss-200">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr,1.35fr]">
        <Panel
          title="Current Booking"
          eyebrow="Session Details"
          actions={
            currentBooking ? (
              <button type="button" className="btn-danger" onClick={handleCancel} disabled={submitting}>
                Cancel Booking
              </button>
            ) : null
          }
        >
          {currentBooking ? (
            <div className="panel-muted p-4">
              <p className="text-sm text-slate-300">Assigned System</p>
              <p className="mt-2 font-display text-4xl font-semibold text-white">{currentBooking.seat_id}</p>
              <p className="mt-2 text-sm text-slate-400">
                {formatDateTime(currentBooking.entry_time)} to {formatDateTime(currentBooking.exit_time)}
              </p>
              <p className="mt-4 text-sm text-slate-300">
                Your booking stays active only for the selected window.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-300">No active booking. Select a system and submit a slot to start a session.</p>
          )}
        </Panel>

        <Panel title="Book a System" eyebrow="Seat Selection">
          <form className="space-y-4" onSubmit={handleBook}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="entry_time">
                  Entry Time
                </label>
                <input
                  id="entry_time"
                  type="datetime-local"
                  className="input-base"
                  value={form.entry_time}
                  onChange={(event) => setForm((current) => ({ ...current, entry_time: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="exit_time">
                  Exit Time
                </label>
                <input
                  id="exit_time"
                  type="datetime-local"
                  className="input-base"
                  value={form.exit_time}
                  onChange={(event) => setForm((current) => ({ ...current, exit_time: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SeatLegend />
              <div className="text-sm text-slate-300">
                Selected system: <span className="font-semibold text-white">{selectedSeat || "None"}</span>
              </div>
            </div>

            {seatStatus?.female_seat_protection_enabled ? (
              <div className="rounded-2xl border border-pink-400/30 bg-pink-400/10 px-4 py-3 text-sm text-pink-100">
                Pink seats belong to rows currently reserved for female students. {user?.gender === "female" ? "Female students can still book them." : "Male students cannot book them while a female booking exists in that row."}
              </div>
            ) : null}

            <SeatGrid
              sections={seatStatus?.sections || []}
              selectedSeat={selectedSeat}
              onSelect={(seat) => setSelectedSeat(seat.seat_id)}
              selectableStatuses={selectableStatuses}
            />

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting || !selectedSeat || Boolean(currentBooking) || seatStatus?.maintenance_mode}
            >
              {submitting ? "Creating booking..." : currentBooking ? "One active booking already exists" : "Book Selected System"}
            </button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel title="Booking History" eyebrow="Recent Sessions">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Row</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studentData?.booking_history?.length ? (
                  studentData.booking_history.map((booking) => (
                    <tr key={booking._id}>
                      <td>{booking.seat_id}</td>
                      <td>{booking.row_id || "-"}</td>
                      <td>{formatDateTime(booking.entry_time)}</td>
                      <td>{formatDateTime(booking.exit_time)}</td>
                      <td className="capitalize">{booking.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-slate-400">
                      No bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Usage Calendar" eyebrow="Activity">
          <UsageCalendar usage={studentData?.usage_calendar || []} />
          {currentBooking ? (
            <div className="mt-4 panel-muted p-4 text-sm text-slate-300">
              Current slot duration: {formatDuration(Math.round((new Date(currentBooking.exit_time) - new Date(currentBooking.entry_time)) / 60000))}
            </div>
          ) : null}
        </Panel>
      </div>

      <ChatBox />
    </AppShell>
  );
};

export default StudentDashboard;
