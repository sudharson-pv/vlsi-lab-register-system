import { Router } from "express";
import authRoutes from "./authRoutes.js";
import bookingRoutes from "./bookingRoutes.js";
import adminRoutes from "./adminRoutes.js";
import creatorRoutes from "./creatorRoutes.js";

const router = Router();

router.use(authRoutes);
router.use(bookingRoutes);
router.use(adminRoutes);
router.use(creatorRoutes);

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "VLSI Lab Register System API is healthy.",
  });
});

export default router;
