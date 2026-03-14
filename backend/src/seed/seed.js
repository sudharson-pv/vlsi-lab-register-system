import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { Student } from "../models/Student.js";
import { SystemMapping } from "../models/SystemMapping.js";
import { AppSetting } from "../models/AppSetting.js";
import { ALL_SEATS } from "../utils/seats.js";

const createOrUpdateUser = async ({
  register_number,
  password,
  student_name,
  year_of_study,
  gender,
  role,
}) => {
  const password_hash = await bcrypt.hash(password, 10);

  await Student.findOneAndUpdate(
    { register_number },
    {
      register_number,
      password_hash,
      student_name,
      year_of_study,
      gender,
      role,
      is_active: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const seedSystemMappings = async () => {
  const operations = ALL_SEATS.map((seat, index) => ({
    updateOne: {
      filter: { seat_label: seat },
      update: {
        seat_label: seat,
        system_id: `SYS-${2300 + index + 1}`,
        ip_address: `192.168.1.${21 + index}`,
      },
      upsert: true,
    },
  }));

  if (operations.length) {
    await SystemMapping.bulkWrite(operations);
  }
};

const run = async () => {
  try {
    await connectDB();

    await Promise.all([
      createOrUpdateUser({
        register_number: env.creatorRegisterNumber,
        password: env.creatorPassword,
        student_name: "System Creator",
        year_of_study: 4,
        gender: "male",
        role: "creator",
      }),
      createOrUpdateUser({
        register_number: env.adminRegisterNumber,
        password: env.adminPassword,
        student_name: "Lab Administrator",
        year_of_study: 4,
        gender: "male",
        role: "admin",
      }),
      createOrUpdateUser({
        register_number: "EE2024001",
        password: "Student@123",
        student_name: "Aadhira V",
        year_of_study: 3,
        gender: "female",
        role: "student",
      }),
      createOrUpdateUser({
        register_number: "EE2024002",
        password: "Student@123",
        student_name: "Kavin S",
        year_of_study: 2,
        gender: "male",
        role: "student",
      }),
      AppSetting.findOneAndUpdate(
        { key: "maintenance_mode" },
        {
          key: "maintenance_mode",
          value: false,
          description: "Global booking maintenance toggle",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
      AppSetting.findOneAndUpdate(
        { key: "female_seat_protection" },
        {
          key: "female_seat_protection",
          value: true,
          description:
            "Reserve remaining row seats for female students when a female booking exists.",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
      seedSystemMappings(),
    ]);

    console.log("Seed data created successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();
