import crypto from "crypto";

export const createId = () => crypto.randomBytes(12).toString("hex");

export const nowIso = () => new Date().toISOString();

const isPlainObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof RegExp);

const toComparable = (value) => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return value;
};

const areEqual = (left, right) => {
  if (left instanceof Date || right instanceof Date) {
    return toComparable(left) === toComparable(right);
  }

  if (typeof left === "boolean" && typeof right === "number") {
    return Number(left) === right;
  }

  if (typeof left === "number" && typeof right === "boolean") {
    return left === Number(right);
  }

  return left === right;
};

const evaluateOperator = (value, operator, expected) => {
  if (operator === "$in") {
    return Array.isArray(expected) && expected.some((entry) => areEqual(value, entry));
  }

  if (operator === "$lte") {
    return toComparable(value) <= toComparable(expected);
  }

  if (operator === "$ne") {
    return !areEqual(value, expected);
  }

  return false;
};

export const matchesFilter = (row, filter = {}) =>
  Object.entries(filter).every(([field, condition]) => {
    const value = row[field];

    if (condition instanceof RegExp) {
      return typeof value === "string" && condition.test(value);
    }

    if (isPlainObject(condition)) {
      return Object.entries(condition).every(([operator, expected]) =>
        evaluateOperator(value, operator, expected),
      );
    }

    return areEqual(value, condition);
  });

const cloneRow = (row) => ({ ...row });

const applySelect = (row, select) => {
  if (!select) {
    return cloneRow(row);
  }

  const fields = String(select)
    .split(/\s+/)
    .map((field) => field.trim())
    .filter(Boolean);

  const result = { _id: row._id };

  fields.forEach((field) => {
    if (field in row) {
      result[field] = row[field];
    }
  });

  return result;
};

const compareValues = (left, right) => {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return -1;
  }

  if (right == null) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  const leftComparable = toComparable(left);
  const rightComparable = toComparable(right);

  if (
    typeof leftComparable === "number" &&
    typeof rightComparable === "number"
  ) {
    return leftComparable - rightComparable;
  }

  return String(left).localeCompare(String(right));
};

const applySort = (rows, sort) => {
  if (!sort || typeof sort !== "object") {
    return rows;
  }

  const entries = Object.entries(sort);

  if (!entries.length) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const [field, directionRaw] of entries) {
      const direction = Number(directionRaw) >= 0 ? 1 : -1;
      const comparison = compareValues(left[field], right[field]);

      if (comparison !== 0) {
        return comparison * direction;
      }
    }

    return 0;
  });
};

export const createQuery = ({ fetchRows, single = false, wrap }) => {
  const state = {
    select: null,
    sort: null,
    limit: null,
    lean: false,
  };

  const execute = () => {
    let rows = fetchRows().map(cloneRow);

    rows = applySort(rows, state.sort);

    if (typeof state.limit === "number" && state.limit >= 0) {
      rows = rows.slice(0, state.limit);
    }

    rows = rows.map((row) => applySelect(row, state.select));

    if (single) {
      const row = rows[0] || null;

      if (!row) {
        return null;
      }

      if (state.lean || !wrap) {
        return row;
      }

      return wrap(row);
    }

    if (state.lean || !wrap) {
      return rows;
    }

    return rows.map((row) => wrap(row));
  };

  const query = {
    select(value) {
      state.select = value;
      return query;
    },
    sort(value) {
      state.sort = value;
      return query;
    },
    limit(value) {
      state.limit = Number(value);
      return query;
    },
    lean() {
      state.lean = true;
      return query;
    },
    session() {
      return query;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve().then(execute).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve().then(execute).catch(onRejected);
    },
    finally(onFinally) {
      return Promise.resolve().then(execute).finally(onFinally);
    },
  };

  return query;
};

export const toBoolean = (value) => Boolean(value);

export const toBooleanInt = (value) => (value ? 1 : 0);

export const toIsoString = (value, fallback = null) => {
  if (value == null) {
    return fallback;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
};

export const mapSqliteDuplicateError = (error) => {
  const message = String(error?.message || "");
  if (!message.includes("UNIQUE constraint failed")) {
    return error;
  }

  const match = message.match(/UNIQUE constraint failed: [^.]+\.([a-zA-Z0-9_]+)/);
  const field = match?.[1];
  const duplicate = new Error(message);
  duplicate.code = 11000;
  duplicate.keyPattern = field ? { [field]: 1 } : {};
  return duplicate;
};
