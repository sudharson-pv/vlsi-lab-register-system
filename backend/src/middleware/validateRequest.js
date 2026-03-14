import { validationResult } from "express-validator";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "../utils/apiError.js";

export const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new ApiError(StatusCodes.BAD_REQUEST, "Validation failed.", errors.array()),
    );
  }

  return next();
};
