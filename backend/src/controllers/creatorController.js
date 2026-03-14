import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import { Student } from "../models/Student.js";
import { Booking } from "../models/Booking.js";
import { SystemMapping } from "../models/SystemMapping.js";
import { AppSetting } from "../models/AppSetting.js";
import { ApiError } from "../utils/apiError.js";
import { ALL_SEATS } from "../utils/seats.js";
import { broadcastSystemState } from "../services/stateService.js";
import { runSimulationScenario } from "../services/simulationService.js";

export const listStudents = async (_req, res, next) => {
  try {
    const students = await Student.find({ role: "student" })
      .select("register_number student_name year_of_study gender created_at")
      .sort({ register_number: 1 })
      .lean();

    res.status(StatusCodes.OK).json({
      success: true,
      students,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const password_hash = await bcrypt.hash(req.body.password, 10);

    const student = await Student.create({
      register_number: req.body.register_number.toUpperCase().trim(),
      password_hash,
      student_name: req.body.student_name,
      year_of_study: req.body.year_of_study,
      gender: req.body.gender,
      role: "student",
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Student created successfully.",
      student: student.toSafeObject(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        new ApiError(StatusCodes.CONFLICT, "Register number already exists."),
      );
    }

    return next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      role: "student",
    });

    if (!student) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Student not found.");
    }

    if (req.body.student_name) {
      student.student_name = req.body.student_name;
    }

    if (req.body.year_of_study) {
      student.year_of_study = req.body.year_of_study;
    }

    if (req.body.gender) {
      student.gender = req.body.gender;
    }

    if (req.body.password) {
      student.password_hash = await bcrypt.hash(req.body.password, 10);
    }

    await student.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Student updated successfully.",
      student: student.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({
      _id: req.params.id,
      role: "student",
    });

    if (!student) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Student not found.");
    }

    const activeBooking = await Booking.findOne({
      register_number: student.register_number,
      status: "active",
    }).lean();

    if (activeBooking) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Cannot delete a student with an active booking.",
      );
    }

    await student.deleteOne();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Student deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemMappings = async (_req, res, next) => {
  try {
    const mappings = await SystemMapping.find({}).sort({ seat_label: 1 }).lean();
    const mappedSeats = new Set(mappings.map((mapping) => mapping.seat_label));

    res.status(StatusCodes.OK).json({
      success: true,
      mappings,
      unmapped_seats: ALL_SEATS.filter((seatId) => !mappedSeats.has(seatId)),
    });
  } catch (error) {
    next(error);
  }
};

export const upsertSystemMapping = async (req, res, next) => {
  try {
    const mapping = await SystemMapping.findOneAndUpdate(
      { seat_label: req.body.seat_label.toUpperCase().trim() },
      {
        seat_label: req.body.seat_label.toUpperCase().trim(),
        system_id: req.body.system_id,
        ip_address: req.body.ip_address,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "System mapping saved successfully.",
      mapping,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        new ApiError(
          StatusCodes.CONFLICT,
          "The seat label or IP address is already mapped.",
        ),
      );
    }

    return next(error);
  }
};

export const deleteSystemMapping = async (req, res, next) => {
  try {
    await SystemMapping.deleteOne({
      seat_label: req.params.seatLabel.toUpperCase().trim(),
    });

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "System mapping removed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateFemaleSeatProtection = async (req, res, next) => {
  try {
    const setting = await AppSetting.findOneAndUpdate(
      { key: "female_seat_protection" },
      {
        key: "female_seat_protection",
        value: Boolean(req.body.enabled),
        description:
          "Reserve remaining row seats for female students when a female booking exists.",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Girls seat protection ${setting.value ? "enabled" : "disabled"}.`,
      female_seat_protection_enabled: Boolean(setting.value),
    });
  } catch (error) {
    next(error);
  }
};

export const simulateBookings = async (req, res, next) => {
  try {
    const results = await runSimulationScenario(req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};
