import { getDb } from "../config/db.js";
import {
  createId,
  createQuery,
  mapSqliteDuplicateError,
  matchesFilter,
  nowIso,
  toIsoString,
} from "./sqlHelpers.js";

const normalizeSeatId = (value) => String(value || "").toUpperCase().trim();

const normalizeBlockedRow = (row) => ({
  _id: row._id,
  seat_id: normalizeSeatId(row.seat_id),
  reason: String(row.reason || "").trim(),
  blocked_at: toIsoString(row.blocked_at, nowIso()),
});

const serializeBlocked = (row) => ({
  _id: row._id,
  seat_id: normalizeSeatId(row.seat_id),
  reason: String(row.reason || "").trim(),
  blocked_at: toIsoString(row.blocked_at, nowIso()),
});

const getAllBlocked = () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM blocked_systems").all();
  return rows.map((row) => normalizeBlockedRow({ ...row }));
};

const filterBlocked = (filter = {}) =>
  getAllBlocked().filter((entry) => matchesFilter(entry, filter));

export const BlockedSystem = {
  find(filter = {}) {
    return createQuery({
      fetchRows: () => filterBlocked(filter),
    });
  },

  findOne(filter = {}) {
    return createQuery({
      fetchRows: () => filterBlocked(filter),
      single: true,
    });
  },

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const db = getDb();
    const existing = filterBlocked(filter)[0];

    if (!existing && !options.upsert) {
      return null;
    }

    const record = serializeBlocked({
      ...(existing || {}),
      ...(existing ? {} : { _id: createId(), blocked_at: nowIso() }),
      ...filter,
      ...update,
    });

    try {
      if (existing) {
        db.prepare(
          `
            UPDATE blocked_systems
            SET seat_id = :seat_id,
                reason = :reason,
                blocked_at = :blocked_at
            WHERE _id = :_id
          `,
        ).run(record);
      } else {
        db.prepare(
          `
            INSERT INTO blocked_systems (_id, seat_id, reason, blocked_at)
            VALUES (:_id, :seat_id, :reason, :blocked_at)
          `,
        ).run(record);
      }
    } catch (error) {
      throw mapSqliteDuplicateError(error);
    }

    return normalizeBlockedRow(record);
  },

  async deleteOne(filter = {}) {
    const rows = filterBlocked(filter);
    const db = getDb();

    rows.slice(0, 1).forEach((row) => {
      db.prepare("DELETE FROM blocked_systems WHERE _id = ?").run(row._id);
    });

    return {
      acknowledged: true,
      deletedCount: rows.length ? 1 : 0,
    };
  },

  async deleteMany(filter = {}) {
    const rows = filterBlocked(filter);
    const db = getDb();

    rows.forEach((row) => {
      db.prepare("DELETE FROM blocked_systems WHERE _id = ?").run(row._id);
    });

    return {
      acknowledged: true,
      deletedCount: rows.length,
    };
  },
};
