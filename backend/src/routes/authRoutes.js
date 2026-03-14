import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { login, getProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

router.post(
  "/login",
  loginLimiter,
  [
    body("register_number").trim().notEmpty(),
    body("password").isLength({ min: 6 }),
    validateRequest,
  ],
  login,
);

router.get("/me", authenticate, getProfile);

export default router;
