import mongoose from "mongoose";
import { env } from "./env.js";
import { setTransactionsEnabled } from "./transaction.js";

export const connectDB = async () => {
  await mongoose.connect(env.mongoUri);

  let supportsTransactions = false;

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supportsTransactions = Boolean(hello?.setName);
  } catch (error) {
    supportsTransactions = false;
  }

  setTransactionsEnabled(supportsTransactions);

  console.log(
    `MongoDB connected (${supportsTransactions ? "transactions enabled" : "transactions fallback mode"})`,
  );
};
