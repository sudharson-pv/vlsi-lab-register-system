import { StatusCodes } from "http-status-codes";
import { BlockedSystem } from "../models/BlockedSystem.js";
import { AppSetting } from "../models/AppSetting.js";
import {
  broadcastSystemState,
  getAdminDashboardPayload,
} from "../services/stateService.js";

export const getAdminDashboard = async (_req, res, next) => {
  try {
    const payload = await getAdminDashboardPayload();

    res.status(StatusCodes.OK).json({
      success: true,
      ...payload,
    });
  } catch (error) {
    next(error);
  }
};

export const blockSystem = async (req, res, next) => {
  try {
    const blocked = await BlockedSystem.findOneAndUpdate(
      { seat_id: req.body.seat_id.toUpperCase().trim() },
      {
        seat_id: req.body.seat_id.toUpperCase().trim(),
        reason: req.body.reason,
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
      message: "System blocked successfully.",
      blocked,
    });
  } catch (error) {
    next(error);
  }
};

export const unblockSystem = async (req, res, next) => {
  try {
    await BlockedSystem.deleteOne({
      seat_id: req.params.seatId.toUpperCase().trim(),
    });

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "System unblocked successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const toggleMaintenance = async (req, res, next) => {
  try {
    const setting = await AppSetting.findOneAndUpdate(
      { key: "maintenance_mode" },
      {
        key: "maintenance_mode",
        value: Boolean(req.body.maintenance_mode),
        description: "Global booking maintenance toggle",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await broadcastSystemState();

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Maintenance mode ${setting.value ? "enabled" : "disabled"}.`,
      maintenance_mode: Boolean(setting.value),
    });
  } catch (error) {
    next(error);
  }
};
