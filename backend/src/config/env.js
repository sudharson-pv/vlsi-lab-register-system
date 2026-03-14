import dotenv from "dotenv";

dotenv.config();

const parseClientUrls = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const expandLoopbackOrigins = (origins) => {
  const expanded = new Set();

  origins.forEach((origin) => {
    expanded.add(origin);

    try {
      const parsed = new URL(origin);

      if (parsed.hostname === "localhost") {
        parsed.hostname = "127.0.0.1";
        expanded.add(parsed.origin);
      } else if (parsed.hostname === "127.0.0.1") {
        parsed.hostname = "localhost";
        expanded.add(parsed.origin);
      }
    } catch (_error) {
      // Ignore malformed custom entries and keep raw value.
    }
  });

  return [...expanded];
};

const rawClientUrls = parseClientUrls(
  process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173",
);
const clientUrls = expandLoopbackOrigins(rawClientUrls);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  sqlitePath: process.env.SQLITE_PATH || "",
  mongoUri:
    process.env.MONGO_URI || "mongodb://localhost:27017/vlsi_lab_register",
  jwtSecret: process.env.JWT_SECRET || "change-this-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  clientUrls,
  clientUrl: clientUrls[0],
  creatorRegisterNumber:
    process.env.CREATOR_REGISTER_NUMBER || "CREATOR001",
  creatorPassword: process.env.CREATOR_PASSWORD || "Creator@123",
  adminRegisterNumber: process.env.ADMIN_REGISTER_NUMBER || "ADMIN001",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123",
};
