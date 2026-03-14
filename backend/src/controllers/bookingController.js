import { StatusCodes } from "http-status-codes";
import {
  createBooking,
  cancelBooking,
} from "../services/bookingService.js";
import {
  broadcastSystemState,
  getSeatStatusPayload,
  getStudentBookingsPayload,
} from "../services/stateService.js";
import { getClientIp } from "../utils/clientIp.js";

export const bookSystem = async (req, res, next) => {
  try {
    const result = await createBooking({
      seat_id: req.body.seat_id,
      entry_time: req.body.entry_time,
      exit_time: req.body.exit_time,
      student: req.user,
      client_ip: getClientIp(req),
    });

    await broadcastSystemState();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "System booked successfully.",
      booking: result.booking,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBookingController = async (req, res, next) => {
  try {
    const booking = await cancelBooking({
      booking_id: req.body.booking_id,
      user: req.user,
    });

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getSeatStatus = async (_req, res, next) => {
  try {
    const payload = await getSeatStatusPayload();

    res.status(StatusCodes.OK).json({
      success: true,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentBookings = async (req, res, next) => {
  try {
    const registerNumber =
      req.user.role === "student"
        ? req.user.register_number
        : (req.query.register_number || req.user.register_number)
            .toUpperCase()
            .trim();

    const payload = await getStudentBookingsPayload(registerNumber);

    res.status(StatusCodes.OK).json({
      success: true,
      register_number: registerNumber,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};
