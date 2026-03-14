import { Router } from "express";
import { body, param } from "express-validator";
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getSystemMappings,
  upsertSystemMapping,
  deleteSystemMapping,
  updateFemaleSeatProtection,
  simulateBookings,
} from "../controllers/creatorController.js";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.use(authenticate, authorize("creator"));

router.get("/creator/students", listStudents);

router.post(
  "/creator/students",
  [
    body("register_number").trim().notEmpty(),
    body("student_name").trim().isLength({ min: 2 }),
    body("year_of_study").isInt({ min: 1, max: 8 }),
    body("gender").isIn(["male", "female"]),
    body("password").isLength({ min: 6 }),
    validateRequest,
  ],
  createStudent,
);

router.put(
  "/creator/students/:id",
  [
    param("id").isMongoId(),
    body("student_name").optional().trim().isLength({ min: 2 }),
    body("year_of_study").optional().isInt({ min: 1, max: 8 }),
    body("gender").optional().isIn(["male", "female"]),
    body("password").optional().isLength({ min: 6 }),
    validateRequest,
  ],
  updateStudent,
);

router.delete(
  "/creator/students/:id",
  [param("id").isMongoId(), validateRequest],
  deleteStudent,
);

router.get("/creator/system-mapping", getSystemMappings);

router.post(
  "/creator/system-mapping",
  [
    body("seat_label").trim().notEmpty(),
    body("system_id").trim().notEmpty(),
    body("ip_address").trim().notEmpty(),
    validateRequest,
  ],
  upsertSystemMapping,
);

router.delete(
  "/creator/system-mapping/:seatLabel",
  [param("seatLabel").trim().notEmpty(), validateRequest],
  deleteSystemMapping,
);

router.patch(
  "/creator/female-seat-protection",
  [body("enabled").isBoolean(), validateRequest],
  updateFemaleSeatProtection,
);

router.post(
  "/creator/simulate",
  [
    body("scenario").isIn([
      "single_success",
      "same_seat_race",
      "same_student_multiple",
      "block_during_booking",
      "multiple_different_seats",
    ]),
    body("seat_id").optional().trim().notEmpty(),
    body("secondary_seat_id").optional().trim().notEmpty(),
    validateRequest,
  ],
  simulateBookings,
);

export default router;
