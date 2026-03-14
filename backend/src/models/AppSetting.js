import { getDb } from "../config/db.js";
import {
  createId,
  createQuery,
  mapSqliteDuplicateError,
  matchesFilter,
} from "./sqlHelpers.js";

const normalizeValue = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const serializeValue = (value) => JSON.stringify(value ?? null);

const normalizeSettingRow = (row) => ({
  _id: row._id,
  key: String(row.key || "").trim(),
  value: normalizeValue(row.value),
  description: String(row.description || ""),
});

const serializeSetting = (row) => ({
  _id: row._id,
  key: String(row.key || "").trim(),
  value: serializeValue(row.value),
  description: String(row.description || ""),
});

const getAllSettings = () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM app_settings").all();
  return rows.map((row) => normalizeSettingRow({ ...row }));
};

const filterSettings = (filter = {}) =>
  getAllSettings().filter((entry) => matchesFilter(entry, filter));

export const AppSetting = {
  find(filter = {}) {
    return createQuery({
      fetchRows: () => filterSettings(filter),
    });
  },

  findOne(filter = {}) {
    return createQuery({
      fetchRows: () => filterSettings(filter),
      single: true,
    });
  },

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const db = getDb();
    const existing = filterSettings(filter)[0];

    if (!existing && !options.upsert) {
      return null;
    }

    const record = serializeSetting({
      ...(existing || {}),
      ...(existing ? {} : { _id: createId() }),
      ...filter,
      ...update,
    });

    try {
      if (existing) {
        db.prepare(
          `
            UPDATE app_settings
            SET key = :key,
                value = :value,
                description = :description
            WHERE _id = :_id
          `,
        ).run(record);
      } else {
        db.prepare(
          `
            INSERT INTO app_settings (_id, key, value, description)
            VALUES (:_id, :key, :value, :description)
          `,
        ).run(record);
      }
    } catch (error) {
      throw mapSqliteDuplicateError(error);
    }

    return normalizeSettingRow(record);
  },
};
