import { Booking } from "../models/Booking.js";
import { BlockedSystem } from "../models/BlockedSystem.js";
import { SystemMapping } from "../models/SystemMapping.js";
import { AppSetting } from "../models/AppSetting.js";
import { Student } from "../models/Student.js";
import {
  ALL_SEATS,
  SEAT_LAYOUT,
  getSeatSection,
  getRowId,
  getRowLabel,
  getRowNumber,
} from "../utils/seats.js";
import { getIo } from "../socket/index.js";

const withSession = (query, _session) => query;

const getDurationMinutes = (entryTime, exitTime) =>
  Math.max(
    0,
    Math.round(
      (new Date(exitTime).getTime() - new Date(entryTime).getTime()) / 60000,
    ),
  );

const sortByValueDescThenMinutes = (left, right) =>
  right.bookings - left.bookings || right.total_minutes - left.total_minutes;

export const releaseExpiredBookings = async (_session = null) => {
  await Booking.updateMany(
    {
      status: "active",
      exit_time: { $lte: new Date() },
    },
    {
      $set: {
        status: "completed",
      },
    },
  );
};

const getAppBooleanSetting = async (key, defaultValue, session = null) => {
  const query = AppSetting.findOne({ key }).lean();
  const setting = await withSession(query, session);
  return setting?.value ?? defaultValue;
};

export const getMaintenanceMode = async (session = null) =>
  Boolean(await getAppBooleanSetting("maintenance_mode", false, session));

export const getFemaleSeatProtectionEnabled = async (session = null) =>
  Boolean(await getAppBooleanSetting("female_seat_protection", true, session));

const getRowReservations = async (
  activeBookings,
  femaleSeatProtectionEnabled,
  session = null,
) => {
  if (!femaleSeatProtectionEnabled || !activeBookings.length) {
    return [];
  }

  const registerNumbers = [
    ...new Set(activeBookings.map((booking) => booking.register_number)),
  ];
  const studentQuery = Student.find({
    register_number: { $in: registerNumbers },
    gender: "female",
  })
    .select("register_number student_name")
    .lean();
  const femaleStudents = await withSession(studentQuery, session);
  const femaleRegisterNumbers = new Set(
    femaleStudents.map((student) => student.register_number),
  );

  const reservations = new Map();

  activeBookings.forEach((booking) => {
    if (!femaleRegisterNumbers.has(booking.register_number)) {
      return;
    }

    const rowId = booking.row_id || getRowId(booking.seat_id);

    if (!reservations.has(rowId)) {
      reservations.set(rowId, {
        row_id: rowId,
        row_label: getRowLabel(booking.seat_id),
        row_number: getRowNumber(booking.seat_id),
        section: getSeatSection(booking.seat_id),
        female_booking_count: 0,
        active_seats: [],
        female_students: [],
      });
    }

    const row = reservations.get(rowId);
    row.female_booking_count += 1;
    row.active_seats.push(booking.seat_id);

    if (
      !row.female_students.some(
        (student) => student.register_number === booking.register_number,
      )
    ) {
      row.female_students.push({
        register_number: booking.register_number,
        student_name: booking.student_name,
      });
    }
  });

  return [...reservations.values()].sort(
    (left, right) =>
      left.section.localeCompare(right.section) ||
      left.row_number - right.row_number,
  );
};

export const getSeatStatusPayload = async () => {
  await releaseExpiredBookings();

  const [
    activeBookings,
    blockedSystems,
    mappings,
    maintenanceMode,
    femaleSeatProtectionEnabled,
  ] = await Promise.all([
    Booking.find({ status: "active" }).lean(),
    BlockedSystem.find({}).lean(),
    SystemMapping.find({}).lean(),
    getMaintenanceMode(),
    getFemaleSeatProtectionEnabled(),
  ]);

  const rowReservations = await getRowReservations(
    activeBookings,
    femaleSeatProtectionEnabled,
  );

  const bookingMap = new Map(
    activeBookings.map((booking) => [booking.seat_id, booking]),
  );
  const blockedMap = new Map(
    blockedSystems.map((blocked) => [blocked.seat_id, blocked]),
  );
  const mappingMap = new Map(
    mappings.map((mapping) => [mapping.seat_label, mapping]),
  );
  const rowReservationMap = new Map(
    rowReservations.map((reservation) => [reservation.row_id, reservation]),
  );

  const seats = ALL_SEATS.map((seatId) => {
    const booking = bookingMap.get(seatId);
    const blocked = blockedMap.get(seatId);
    const mapping = mappingMap.get(seatId);
    const rowId = getRowId(seatId);
    const rowReservation = rowReservationMap.get(rowId);
    const femaleOnly = Boolean(rowReservation) && !booking && !blocked;

    const status = blocked
      ? "blocked"
      : booking
        ? "booked"
        : femaleOnly
          ? "female_reserved"
          : "available";

    return {
      seat_id: seatId,
      section: getSeatSection(seatId),
      row_id: rowId,
      row_label: getRowLabel(seatId),
      row_number: getRowNumber(seatId),
      status,
      female_only: femaleOnly,
      female_reservation_active: Boolean(rowReservation),
      female_booking_count: rowReservation?.female_booking_count || 0,
      reason: blocked?.reason || null,
      register_number: booking?.register_number || null,
      student_name: booking?.student_name || null,
      entry_time: booking?.entry_time || null,
      exit_time: booking?.exit_time || null,
      system_id: mapping?.system_id || null,
      ip_address: mapping?.ip_address || null,
    };
  });

  const summary = seats.reduce(
    (accumulator, seat) => {
      accumulator[seat.status] += 1;
      return accumulator;
    },
    {
      total: seats.length,
      available: 0,
      booked: 0,
      blocked: 0,
      female_reserved: 0,
    },
  );

  const sections = SEAT_LAYOUT.map((section) => ({
    id: section.id,
    title: section.title,
    seats: seats.filter((seat) => section.seats.includes(seat.seat_id)),
  }));

  return {
    maintenance_mode: maintenanceMode,
    female_seat_protection_enabled: femaleSeatProtectionEnabled,
    row_reservations: rowReservations,
    summary,
    sections,
    seats,
  };
};

export const getStudentBookingsPayload = async (registerNumber) => {
  await releaseExpiredBookings();

  const [currentBooking, bookingHistory, usageBookings] = await Promise.all([
    Booking.findOne({
      register_number: registerNumber,
      status: "active",
      is_simulation: false,
    })
      .sort({ entry_time: 1 })
      .lean(),
    Booking.find({
      register_number: registerNumber,
      is_simulation: false,
    })
      .sort({ timestamp: -1 })
      .limit(25)
      .lean(),
    Booking.find({
      register_number: registerNumber,
      status: { $in: ["active", "completed"] },
      is_simulation: { $ne: true },
    }).lean(),
  ]);

  const usageMap = new Map();

  usageBookings.forEach((booking) => {
    const day = String(booking.entry_time).slice(0, 10);
    const durationMinutes = getDurationMinutes(booking.entry_time, booking.exit_time);
    const current = usageMap.get(day) || { date: day, total_minutes: 0, sessions: 0 };
    current.total_minutes += durationMinutes;
    current.sessions += 1;
    usageMap.set(day, current);
  });

  const usageCalendar = [...usageMap.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  return {
    current_booking: currentBooking,
    booking_history: bookingHistory,
    usage_calendar: usageCalendar,
  };
};

export const getAdminDashboardPayload = async () => {
  await releaseExpiredBookings();

  const [activeBookings, blockedSystems, maintenanceMode, seatStatus, analyticsBookings] =
    await Promise.all([
      Booking.find({ status: "active", is_simulation: false })
        .sort({ entry_time: 1 })
        .lean(),
      BlockedSystem.find({}).sort({ seat_id: 1 }).lean(),
      getMaintenanceMode(),
      getSeatStatusPayload(),
      Booking.find({
        status: { $in: ["active", "completed"] },
        is_simulation: { $ne: true },
      }).lean(),
    ]);

  const mappings = await SystemMapping.find({}).lean();
  const mappingMap = new Map(
    mappings.map((mapping) => [mapping.seat_label, mapping]),
  );

  let totalUsageMinutes = 0;
  let totalSessions = 0;
  const peakHoursMap = new Map();
  const systemUsageMap = new Map();
  const studentUsageMap = new Map();

  analyticsBookings.forEach((booking) => {
    const durationMinutes = getDurationMinutes(booking.entry_time, booking.exit_time);
    totalUsageMinutes += durationMinutes;
    totalSessions += 1;

    const hour = new Date(booking.entry_time).getHours();
    peakHoursMap.set(hour, (peakHoursMap.get(hour) || 0) + 1);

    const systemEntry = systemUsageMap.get(booking.seat_id) || {
      seat_id: booking.seat_id,
      bookings: 0,
      total_minutes: 0,
    };
    systemEntry.bookings += 1;
    systemEntry.total_minutes += durationMinutes;
    systemUsageMap.set(booking.seat_id, systemEntry);

    const studentEntry = studentUsageMap.get(booking.register_number) || {
      register_number: booking.register_number,
      student_name: booking.student_name,
      bookings: 0,
      total_minutes: 0,
    };
    studentEntry.student_name = booking.student_name || studentEntry.student_name;
    studentEntry.bookings += 1;
    studentEntry.total_minutes += durationMinutes;
    studentUsageMap.set(booking.register_number, studentEntry);
  });

  const peakHours = [...peakHoursMap.entries()]
    .map(([hour, bookings]) => ({
      hour: Number(hour),
      bookings,
    }))
    .sort((left, right) => left.hour - right.hour);

  const mostUsedSystems = [...systemUsageMap.values()]
    .sort(sortByValueDescThenMinutes)
    .slice(0, 8);

  const studentUsageFrequency = [...studentUsageMap.values()]
    .sort(sortByValueDescThenMinutes)
    .slice(0, 10);

  return {
    maintenance_mode: maintenanceMode,
    female_seat_protection_enabled: seatStatus.female_seat_protection_enabled,
    row_reservations: seatStatus.row_reservations,
    seat_summary: seatStatus.summary,
    blocked_systems: blockedSystems,
    active_bookings: activeBookings.map((booking) => {
      const mapping = mappingMap.get(booking.seat_id);
      const duration_minutes = Math.max(
        1,
        getDurationMinutes(booking.entry_time, booking.exit_time),
      );

      return {
        ...booking,
        system_id: mapping?.system_id || null,
        ip_address: mapping?.ip_address || null,
        duration_minutes,
      };
    }),
    analytics: {
      total_usage_minutes: totalUsageMinutes,
      total_sessions: totalSessions,
      peak_hours: peakHours,
      most_used_systems: mostUsedSystems,
      student_usage_frequency: studentUsageFrequency,
    },
  };
};

export const broadcastSystemState = async () => {
  const io = getIo();

  if (!io) {
    return;
  }

  const [seatStatus, adminDashboard] = await Promise.all([
    getSeatStatusPayload(),
    getAdminDashboardPayload(),
  ]);

  io.emit("seat-status-updated", seatStatus);
  io.to("admin").emit("dashboard-updated", adminDashboard);
  io.to("creator").emit("dashboard-updated", adminDashboard);
};
