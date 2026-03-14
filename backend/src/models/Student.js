import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    register_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    student_name: {
      type: String,
      required: true,
      trim: true,
    },
    year_of_study: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
      default: "male",
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["student", "admin", "creator"],
      default: "student",
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "students",
    versionKey: false,
  },
);

studentSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    register_number: this.register_number,
    student_name: this.student_name,
    year_of_study: this.year_of_study,
    gender: this.gender,
    role: this.role,
    created_at: this.created_at,
  };
};

export const Student = mongoose.model("Student", studentSchema);
