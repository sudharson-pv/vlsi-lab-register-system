import { StatusCodes } from "http-status-codes";
import { Booking } from "../models/Booking.js";
import { BlockedSystem } from "../models/BlockedSystem.js";
import { AppSetting } from "../models/AppSetting.js";
import { Student } from "../models/Student.js";
import { runAtomic } from "../config/transaction.js";
import { ApiError } from "../utils/apiError.js";
import { getRowId, isValidSeat } from "../utils/seats.js";
import {
  getFemaleSeatProtectionEnabled,
  releaseExpiredBookings,
} from "./stateService.js";

const attachSession = (query, session) => {
  if (session) {
    query.session(session);
  }

  return query;
};

const parseDate = (value) => new Date(value);

const normalizeGender = (value = "male") =>
  value?.toLowerCase() === "female" ? "female" : "male";

const validateBookingWindow = (entryTime, exitTime) => {
  if (Number.isNaN(entryTime.getTime()) || Number.isNaN(exitTime.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid booking time.");
  }

  if (entryTime >= exitTime) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Exit time must be later than entry time.",
    );
  }

  if (exitTime <= new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Booking window must end in the future.",
    );
  }
};

export const createBooking = async ({
  seat_id,
  entry_time,
  exit_time,
  student,
  client_ip,
  is_simulation = false,
}) =>
  runAtomic(async (session) => {
    await releaseExpiredBookings(session);

    const normalizedSeatId = seat_id.toUpperCase().trim();
    const rowId = getRowId(normalizedSeatId);
    const entryTime = parseDate(entry_time);
    const exitTime = parseDate(exit_time);
    const studentGender = normalizeGender(student.gender);

    if (!isValidSeat(normalizedSeatId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid system selection.");
    }

    validateBookingWindow(entryTime, exitTime);

    const maintenanceQuery = AppSetting.findOne({ key: "maintenance_mode" }).lean();
    const maintenanceSetting = await attachSession(maintenanceQuery, session);

    if (maintenanceSetting?.value) {
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "Booking is temporarily disabled for maintenance.",
      );
    }

    const blockedQuery = BlockedSystem.findOne({ seat_id: normalizedSeatId }).lean();
    const blockedSystem = await attachSession(blockedQuery, session);

    if (blockedSystem) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `System ${normalizedSeatId} is blocked: ${blockedSystem.reason}`,
      );
    }

    const femaleSeatProtectionEnabled = await getFemaleSeatProtectionEnabled(session);

    if (femaleSeatProtectionEnabled && studentGender === "male") {
      const rowBookingsQuery = Booking.find({ row_id: rowId, status: "active" })
        .select("register_number")
        .lean();
      const rowBookings = await attachSession(rowBookingsQuery, session);

      if (rowBookings.length) {
        const rowRegisterNumbers = [
          ...new Set(rowBookings.map((booking) => booking.register_number)),
        ];
        const femaleStudentsQuery = Student.find({
          register_number: { $in: rowRegisterNumbers },
          gender: "female",
        })
          .select("register_number")
          .lean();
        const femaleBookingsInRow = await attachSession(
          femaleStudentsQuery,
          session,
        );

        if (femaleBookingsInRow.length) {
          throw new ApiError(
            StatusCodes.CONFLICT,
            "This row is reserved for female students.",
          );
        }
      }
    }

    try {
      const [booking] = await Booking.create(
        [
          {
            seat_id: normalizedSeatId,
            row_id: rowId,
            register_number: student.register_number,
            student_name: student.student_name,
            entry_time: entryTime,
            exit_time: exitTime,
            client_ip: client_ip || null,
            is_simulation,
          },
        ],
        session ? { session } : undefined,
      );

      return {
        booking,
      };
    } catch (error) {
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];

        if (duplicateField === "seat_id") {
          throw new ApiError(
            StatusCodes.CONFLICT,
            "System already booked by another student.",
          );
        }

        if (duplicateField === "register_number") {
          throw new ApiError(
            StatusCodes.CONFLICT,
            "Student already has an active booking.",
          );
        }
      }

      throw error;
    }
  });

export const cancelBooking = async ({ booking_id, user }) =>
  runAtomic(async (session) => {
    await releaseExpiredBookings(session);

    const criteria = booking_id
      ? { _id: booking_id, status: "active" }
      : { register_number: user.register_number, status: "active" };

    const bookingQuery = Booking.findOne(criteria);
    const booking = await attachSession(bookingQuery, session);

    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Active booking not found.");
    }

    if (
      user.role === "student" &&
      booking.register_number !== user.register_number
    ) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You can only cancel your own booking.",
      );
    }

    booking.status = "cancelled";
    booking.cancelled_at = new Date();
    await booking.save(session ? { session } : undefined);

    return booking;
  });
