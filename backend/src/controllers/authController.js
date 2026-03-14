import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { Student } from "../models/Student.js";
import { ApiError } from "../utils/apiError.js";

export const login = async (req, res, next) => {
  try {
    const registerNumber = req.body.register_number.toUpperCase().trim();
    const password = req.body.password;

    const user = await Student.findOne({
      register_number: registerNumber,
      is_active: true,
    });

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials.");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        register_number: user.register_number,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn },
    );

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    user: req.user,
  });
};
