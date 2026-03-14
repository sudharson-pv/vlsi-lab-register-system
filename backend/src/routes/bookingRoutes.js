import { Router } from "express";
import { body } from "express-validator";
import {
  bookSystem,
  cancelBookingController,
  getSeatStatus,
  getStudentBookings,
} from "../controllers/bookingController.js";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.get("/seatStatus", getSeatStatus);

router.get(
  "/studentBookings",
  authenticate,
  authorize("student", "admin", "creator"),
  getStudentBookings,
);

router.post(
  "/book",
  authenticate,
  authorize("student"),
  [
    body("seat_id").trim().notEmpty(),
    body("entry_time").isISO8601(),
    body("exit_time").isISO8601(),
    validateRequest,
  ],
  bookSystem,
);

router.post(
  "/cancelBooking",
  authenticate,
  authorize("student", "admin", "creator"),
  [body("booking_id").optional().isMongoId(), validateRequest],
  cancelBookingController,
);

export default router;
