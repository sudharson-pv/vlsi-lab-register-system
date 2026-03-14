import mongoose from "mongoose";

let transactionsEnabled = false;

export const setTransactionsEnabled = (enabled) => {
  transactionsEnabled = Boolean(enabled);
};

export const hasTransactions = () => transactionsEnabled;

export const runAtomic = async (handler) => {
  if (!transactionsEnabled) {
    return handler(null);
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        result = await handler(session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      },
    );

    return result;
  } finally {
    await session.endSession();
  }
};
