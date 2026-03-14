import { Router } from "express";
import { body, param } from "express-validator";
import {
  getAdminDashboard,
  blockSystem,
  unblockSystem,
  toggleMaintenance,
} from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.use(authenticate, authorize("admin", "creator"));

router.get("/adminDashboard", getAdminDashboard);

router.post(
  "/admin/block-system",
  [
    body("seat_id").trim().notEmpty(),
    body("reason").trim().notEmpty().isLength({ min: 3 }),
    validateRequest,
  ],
  blockSystem,
);

router.delete(
  "/admin/block-system/:seatId",
  [param("seatId").trim().notEmpty(), validateRequest],
  unblockSystem,
);

router.patch(
  "/admin/maintenance",
  [body("maintenance_mode").isBoolean(), validateRequest],
  toggleMaintenance,
);

export default router;
