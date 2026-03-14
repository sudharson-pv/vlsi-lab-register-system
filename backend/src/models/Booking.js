import mongoose from "mongoose";
import { getRowId } from "../utils/seats.js";

const bookingSchema = new mongoose.Schema(
  {
    seat_id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    row_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    register_number: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    student_name: {
      type: String,
      required: true,
      trim: true,
    },
    entry_time: {
      type: Date,
      required: true,
    },
    exit_time: {
      type: Date,
      required: true,
    },
    client_ip: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "completed"],
      default: "active",
      index: true,
    },
    verified_at: {
      type: Date,
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    is_simulation: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    collection: "bookings",
    versionKey: false,
  },
);

bookingSchema.pre("validate", function populateRowId(next) {
  if (this.seat_id && !this.row_id) {
    this.row_id = getRowId(this.seat_id);
  }

  next();
});

bookingSchema.index(
  { seat_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  },
);

bookingSchema.index(
  { register_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "active",
    },
  },
);

export const Booking = mongoose.model("Booking", bookingSchema);
