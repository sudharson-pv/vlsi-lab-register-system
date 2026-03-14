import { getRowId } from "../utils/seats.js";
import { getDb } from "../config/db.js";
import {
  createId,
  createQuery,
  mapSqliteDuplicateError,
  matchesFilter,
  nowIso,
  toBoolean,
  toBooleanInt,
  toIsoString,
} from "./sqlHelpers.js";

const normalizeStatus = (value) => {
  const status = String(value || "active").toLowerCase().trim();
  if (status === "completed" || status === "cancelled") {
    return status;
  }

  return "active";
};

const normalizeBookingRow = (row) => ({
  _id: row._id,
  seat_id: String(row.seat_id || "").toUpperCase().trim(),
  row_id: row.row_id || getRowId(String(row.seat_id || "").toUpperCase().trim()),
  register_number: String(row.register_number || "").toUpperCase().trim(),
  student_name: String(row.student_name || "").trim(),
  entry_time: toIsoString(row.entry_time, nowIso()),
  exit_time: toIsoString(row.exit_time, nowIso()),
  client_ip: row.client_ip ?? null,
  timestamp: toIsoString(row.timestamp, nowIso()),
  status: normalizeStatus(row.status),
  verified_at: toIsoString(row.verified_at, null),
  cancelled_at: toIsoString(row.cancelled_at, null),
  is_simulation: toBoolean(row.is_simulation),
});

const serializeBooking = (booking) => ({
  _id: booking._id,
  seat_id: String(booking.seat_id || "").toUpperCase().trim(),
  row_id:
    String(booking.row_id || "").trim() ||
    getRowId(String(booking.seat_id || "").toUpperCase().trim()),
  register_number: String(booking.register_number || "").toUpperCase().trim(),
  student_name: String(booking.student_name || "").trim(),
  entry_time: toIsoString(booking.entry_time, nowIso()),
  exit_time: toIsoString(booking.exit_time, nowIso()),
  client_ip: booking.client_ip ?? null,
  timestamp: toIsoString(booking.timestamp, nowIso()),
  status: normalizeStatus(booking.status),
  verified_at: toIsoString(booking.verified_at, null),
  cancelled_at: toIsoString(booking.cancelled_at, null),
  is_simulation: toBooleanInt(booking.is_simulation),
});

const getAllBookings = () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM bookings").all();
  return rows.map((row) => normalizeBookingRow({ ...row }));
};

class BookingDocument {
  constructor(row) {
    Object.assign(this, row);
  }

  async save() {
    const db = getDb();
    const payload = serializeBooking(this);

    try {
      db.prepare(
        `
          UPDATE bookings
          SET seat_id = :seat_id,
              row_id = :row_id,
              register_number = :register_number,
              student_name = :student_name,
              entry_time = :entry_time,
              exit_time = :exit_time,
              client_ip = :client_ip,
              timestamp = :timestamp,
              status = :status,
              verified_at = :verified_at,
              cancelled_at = :cancelled_at,
              is_simulation = :is_simulation
          WHERE _id = :_id
        `,
      ).run(payload);
    } catch (error) {
      throw mapSqliteDuplicateError(error);
    }

    Object.assign(this, normalizeBookingRow(payload));
    return this;
  }
}

const wrapBooking = (row) => new BookingDocument(row);

const filterBookings = (filter = {}) =>
  getAllBookings().filter((booking) => matchesFilter(booking, filter));

const applyUpdate = (booking, update) => {
  if (update && typeof update === "object" && update.$set) {
    return {
      ...booking,
      ...update.$set,
    };
  }

  return {
    ...booking,
    ...(update || {}),
  };
};

export const Booking = {
  find(filter = {}) {
    return createQuery({
      fetchRows: () => filterBookings(filter),
      wrap: wrapBooking,
    });
  },

  findOne(filter = {}) {
    return createQuery({
      fetchRows: () => filterBookings(filter),
      single: true,
      wrap: wrapBooking,
    });
  },

  async create(docs, _options) {
    const db = getDb();
    const entries = Array.isArray(docs) ? docs : [docs];
    const created = [];

    for (const entry of entries) {
      const payload = serializeBooking({
        _id: createId(),
        seat_id: entry.seat_id,
        row_id: entry.row_id,
        register_number: entry.register_number,
        student_name: entry.student_name,
        entry_time: entry.entry_time,
        exit_time: entry.exit_time,
        client_ip: entry.client_ip,
        timestamp: entry.timestamp || nowIso(),
        status: entry.status || "active",
        verified_at: entry.verified_at,
        cancelled_at: entry.cancelled_at,
        is_simulation: entry.is_simulation || false,
      });

      try {
        db.prepare(
          `
            INSERT INTO bookings (
              _id, seat_id, row_id, register_number, student_name,
              entry_time, exit_time, client_ip, timestamp, status,
              verified_at, cancelled_at, is_simulation
            ) VALUES (
              :_id, :seat_id, :row_id, :register_number, :student_name,
              :entry_time, :exit_time, :client_ip, :timestamp, :status,
              :verified_at, :cancelled_at, :is_simulation
            )
          `,
        ).run(payload);
      } catch (error) {
        throw mapSqliteDuplicateError(error);
      }

      created.push(wrapBooking(normalizeBookingRow(payload)));
    }

    return Array.isArray(docs) ? created : created[0];
  },

  async updateMany(filter = {}, update = {}) {
    const rows = filterBookings(filter);
    let modifiedCount = 0;

    for (const row of rows) {
      const document = wrapBooking(applyUpdate(row, update));
      await document.save();
      modifiedCount += 1;
    }

    return {
      acknowledged: true,
      matchedCount: rows.length,
      modifiedCount,
    };
  },

  async aggregate() {
    throw new Error("Booking.aggregate is not implemented for SQLite.");
  },
};
