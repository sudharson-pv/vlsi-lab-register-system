import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { Student } from "../models/Student.js";
import { ApiError } from "../utils/apiError.js";

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required.");
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await Student.findById(payload.userId).lean();

    if (!user || !user.is_active) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User account not found.");
    }

    req.user = {
      id: user._id.toString(),
      register_number: user.register_number,
      student_name: user.student_name,
      year_of_study: user.year_of_study,
      gender: user.gender,
      role: user.role,
    };

    next();
  } catch (error) {
    next(
      error.name === "JsonWebTokenError"
        ? new ApiError(StatusCodes.UNAUTHORIZED, "Invalid token.")
        : error,
    );
  }
};

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(StatusCodes.FORBIDDEN, "Insufficient permissions."),
      );
    }

    return next();
  };
