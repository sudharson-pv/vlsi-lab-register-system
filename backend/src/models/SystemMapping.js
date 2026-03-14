import mongoose from "mongoose";

const systemMappingSchema = new mongoose.Schema(
  {
    seat_label: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    system_id: {
      type: String,
      required: true,
      trim: true,
    },
    ip_address: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "system_mapping",
    versionKey: false,
  },
);

systemMappingSchema.index({ ip_address: 1 }, { unique: true });

export const SystemMapping = mongoose.model("SystemMapping", systemMappingSchema);
