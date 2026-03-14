import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { Student } from "../models/Student.js";
import { Booking } from "../models/Booking.js";
import { BlockedSystem } from "../models/BlockedSystem.js";
import { ApiError } from "../utils/apiError.js";
import { createBooking } from "./bookingService.js";
import { isValidSeat } from "../utils/seats.js";

const SIM_PASSWORD = "SimUser@123";

const ensureSimulationStudent = async (
  register_number,
  student_name,
  gender = "male",
) => {
  const existing = await Student.findOne({ register_number });

  if (existing) {
    if (existing.gender !== gender) {
      existing.gender = gender;
      await existing.save();
    }

    return existing;
  }

  const password_hash = await bcrypt.hash(SIM_PASSWORD, 10);

  return Student.create({
    register_number,
    password_hash,
    student_name,
    year_of_study: 4,
    gender,
    role: "student",
  });
};

const cleanupSimulationBookings = async (registerNumbers) => {
  await Booking.updateMany(
    {
      register_number: { $in: registerNumbers },
      status: "active",
    },
    {
      $set: {
        status: "cancelled",
        cancelled_at: new Date(),
      },
    },
  );
};

const cleanupSimulationBlocks = async (seatIds) => {
  await BlockedSystem.deleteMany({
    seat_id: { $in: seatIds },
    reason: /^Simulation/i,
  });
};

const bookingWindow = () => {
  const entry = new Date(Date.now() + 5 * 60 * 1000);
  const exit = new Date(Date.now() + 65 * 60 * 1000);

  return {
    entry_time: entry.toISOString(),
    exit_time: exit.toISOString(),
  };
};

export const runSimulationScenario = async ({
  scenario,
  seat_id = "L1",
  secondary_seat_id = "W1",
}) => {
  const primarySeat = seat_id.toUpperCase();
  const secondarySeat = secondary_seat_id.toUpperCase();

  if (!isValidSeat(primarySeat) || !isValidSeat(secondarySeat)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid simulation seats.");
  }

  const [simOne, simTwo, simThree] = await Promise.all([
    ensureSimulationStudent("SIM001", "Simulation Student One", "male"),
    ensureSimulationStudent("SIM002", "Simulation Student Two", "male"),
    ensureSimulationStudent("SIM003", "Simulation Student Three", "male"),
  ]);

  await cleanupSimulationBookings(["SIM001", "SIM002", "SIM003"]);
  await cleanupSimulationBlocks([primarySeat, secondarySeat, "L2"]);

  const window = bookingWindow();

  if (scenario === "single_success") {
    await createBooking({
      seat_id: primarySeat,
      ...window,
      student: simOne,
      client_ip: "simulation",
      is_simulation: true,
    });

    await cleanupSimulationBookings(["SIM001"]);

    return {
      scenario,
      summary: "Single booking simulation completed successfully.",
      results: [
        {
          actor: simOne.register_number,
          outcome: "success",
          seat_id: primarySeat,
        },
      ],
      test_credentials: {
        register_number: simOne.register_number,
        password: SIM_PASSWORD,
      },
    };
  }

  if (scenario === "same_seat_race") {
    const results = await Promise.allSettled([
      createBooking({
        seat_id: primarySeat,
        ...window,
        student: simOne,
        client_ip: "simulation",
        is_simulation: true,
      }),
      createBooking({
        seat_id: primarySeat,
        ...window,
        student: simTwo,
        client_ip: "simulation",
        is_simulation: true,
      }),
    ]);

    await cleanupSimulationBookings(["SIM001", "SIM002"]);

    return {
      scenario,
      summary: "Two students attempted to book the same seat simultaneously.",
      results: results.map((result, index) => ({
        actor: index === 0 ? simOne.register_number : simTwo.register_number,
        outcome: result.status === "fulfilled" ? "success" : "failed",
        message:
          result.status === "fulfilled"
            ? "Booking acquired."
            : result.reason.message,
      })),
    };
  }

  if (scenario === "same_student_multiple") {
    const results = await Promise.allSettled([
      createBooking({
        seat_id: primarySeat,
        ...window,
        student: simOne,
        client_ip: "simulation",
        is_simulation: true,
      }),
      createBooking({
        seat_id: secondarySeat,
        ...window,
        student: simOne,
        client_ip: "simulation",
        is_simulation: true,
      }),
    ]);

    await cleanupSimulationBookings(["SIM001"]);

    return {
      scenario,
      summary: "The same student attempted to hold two bookings.",
      results: results.map((result, index) => ({
        actor: simOne.register_number,
        seat_id: index === 0 ? primarySeat : secondarySeat,
        outcome: result.status === "fulfilled" ? "success" : "failed",
        message:
          result.status === "fulfilled"
            ? "Booking acquired."
            : result.reason.message,
      })),
    };
  }

  if (scenario === "block_during_booking") {
    const results = await Promise.allSettled([
      createBooking({
        seat_id: primarySeat,
        ...window,
        student: simOne,
        client_ip: "simulation",
        is_simulation: true,
      }),
      BlockedSystem.findOneAndUpdate(
        { seat_id: primarySeat },
        { seat_id: primarySeat, reason: "Simulation maintenance block" },
        { upsert: true, new: true },
      ),
    ]);

    await cleanupSimulationBookings(["SIM001"]);
    await cleanupSimulationBlocks([primarySeat]);

    return {
      scenario,
      summary: "Admin blocking was simulated while a booking request was in flight.",
      results: [
        {
          actor: simOne.register_number,
          outcome: results[0].status === "fulfilled" ? "success" : "failed",
          message:
            results[0].status === "fulfilled"
              ? "Booking reached the database first."
              : results[0].reason.message,
        },
        {
          actor: "ADMIN_BLOCK",
          outcome: results[1].status === "fulfilled" ? "success" : "failed",
          message:
            results[1].status === "fulfilled"
              ? "Seat block persisted."
              : results[1].reason.message,
        },
      ],
    };
  }

  if (scenario === "multiple_different_seats") {
    const results = await Promise.allSettled([
      createBooking({
        seat_id: primarySeat,
        ...window,
        student: simOne,
        client_ip: "simulation",
        is_simulation: true,
      }),
      createBooking({
        seat_id: secondarySeat,
        ...window,
        student: simTwo,
        client_ip: "simulation",
        is_simulation: true,
      }),
      createBooking({
        seat_id: "L2",
        ...window,
        student: simThree,
        client_ip: "simulation",
        is_simulation: true,
      }),
    ]);

    await cleanupSimulationBookings(["SIM001", "SIM002", "SIM003"]);

    return {
      scenario,
      summary: "Multiple students booked different seats in parallel.",
      results: results.map((result, index) => ({
        actor: ["SIM001", "SIM002", "SIM003"][index],
        seat_id: [primarySeat, secondarySeat, "L2"][index],
        outcome: result.status === "fulfilled" ? "success" : "failed",
        message:
          result.status === "fulfilled"
            ? "Booking acquired."
            : result.reason.message,
      })),
    };
  }

  throw new ApiError(StatusCodes.BAD_REQUEST, "Unknown simulation scenario.");
};
