import mongoose from "mongoose";

const blockedSystemSchema = new mongoose.Schema(
  {
    seat_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    blocked_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "blocked_systems",
    versionKey: false,
  },
);

export const BlockedSystem = mongoose.model(
  "BlockedSystem",
  blockedSystemSchema,
);
