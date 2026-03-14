import { getDb } from "./db.js";

let transactionsEnabled = true;
let inTransaction = false;

export const setTransactionsEnabled = (enabled) => {
  transactionsEnabled = Boolean(enabled);
};

export const hasTransactions = () => transactionsEnabled;

export const runAtomic = async (handler) => {
  if (!transactionsEnabled || inTransaction) {
    return handler(null);
  }

  const db = getDb();
  inTransaction = true;
  db.exec("BEGIN IMMEDIATE;");

  try {
    const result = await handler(null);
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch (_rollbackError) {
      // Ignore rollback failures and surface the original error.
    }
    throw error;
  } finally {
    inTransaction = false;
  }
};
