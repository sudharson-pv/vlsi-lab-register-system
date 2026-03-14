import { getDb } from "../config/db.js";
import {
  createId,
  createQuery,
  mapSqliteDuplicateError,
  matchesFilter,
} from "./sqlHelpers.js";

const normalizeSeatLabel = (value) => String(value || "").toUpperCase().trim();

const normalizeMappingRow = (row) => ({
  _id: row._id,
  seat_label: normalizeSeatLabel(row.seat_label),
  system_id: String(row.system_id || "").trim(),
  ip_address: String(row.ip_address || "").trim(),
});

const serializeMapping = (row) => ({
  _id: row._id,
  seat_label: normalizeSeatLabel(row.seat_label),
  system_id: String(row.system_id || "").trim(),
  ip_address: String(row.ip_address || "").trim(),
});

const getAllMappings = () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM system_mapping").all();
  return rows.map((row) => normalizeMappingRow({ ...row }));
};

const filterMappings = (filter = {}) =>
  getAllMappings().filter((entry) => matchesFilter(entry, filter));

const upsertMapping = (filter = {}, update = {}, options = {}) => {
  const db = getDb();
  const existing = filterMappings(filter)[0];

  if (!existing && !options.upsert) {
    return null;
  }

  const record = serializeMapping({
    ...(existing || {}),
    ...(existing ? {} : { _id: createId() }),
    ...filter,
    ...update,
  });

  try {
    if (existing) {
      db.prepare(
        `
          UPDATE system_mapping
          SET seat_label = :seat_label,
              system_id = :system_id,
              ip_address = :ip_address
          WHERE _id = :_id
        `,
      ).run(record);
    } else {
      db.prepare(
        `
          INSERT INTO system_mapping (_id, seat_label, system_id, ip_address)
          VALUES (:_id, :seat_label, :system_id, :ip_address)
        `,
      ).run(record);
    }
  } catch (error) {
    throw mapSqliteDuplicateError(error);
  }

  return normalizeMappingRow(record);
};

export const SystemMapping = {
  find(filter = {}) {
    return createQuery({
      fetchRows: () => filterMappings(filter),
    });
  },

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    return upsertMapping(filter, update, options);
  },

  async deleteOne(filter = {}) {
    const rows = filterMappings(filter);
    const db = getDb();

    rows.slice(0, 1).forEach((row) => {
      db.prepare("DELETE FROM system_mapping WHERE _id = ?").run(row._id);
    });

    return {
      acknowledged: true,
      deletedCount: rows.length ? 1 : 0,
    };
  },

  async bulkWrite(operations = []) {
    for (const operation of operations) {
      const updateOne = operation?.updateOne;

      if (!updateOne) {
        continue;
      }

      upsertMapping(
        updateOne.filter || {},
        updateOne.update || {},
        { upsert: Boolean(updateOne.upsert) },
      );
    }

    return {
      acknowledged: true,
    };
  },
};
