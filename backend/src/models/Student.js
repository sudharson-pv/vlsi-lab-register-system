import { getDb } from "../config/db.js";
import {
  createId,
  createQuery,
  mapSqliteDuplicateError,
  matchesFilter,
  nowIso,
  toBoolean,
  toBooleanInt,
  toIsoString,
} from "./sqlHelpers.js";

const normalizeRegisterNumber = (value) => String(value || "").toUpperCase().trim();

const normalizeGender = (value) => {
  const gender = String(value || "male").toLowerCase().trim();
  return gender === "female" ? "female" : "male";
};

const normalizeRole = (value) => {
  const role = String(value || "student").toLowerCase().trim();
  if (role === "admin" || role === "creator") {
    return role;
  }

  return "student";
};

const normalizeStudentRow = (row) => ({
  _id: row._id,
  register_number: row.register_number,
  password_hash: row.password_hash,
  student_name: row.student_name,
  year_of_study: Number(row.year_of_study),
  gender: normalizeGender(row.gender),
  role: normalizeRole(row.role),
  is_active: toBoolean(row.is_active),
  created_at: toIsoString(row.created_at, nowIso()),
});

const serializeStudent = (student) => ({
  _id: student._id,
  register_number: normalizeRegisterNumber(student.register_number),
  password_hash: student.password_hash,
  student_name: String(student.student_name || "").trim(),
  year_of_study: Number(student.year_of_study),
  gender: normalizeGender(student.gender),
  role: normalizeRole(student.role),
  is_active: toBooleanInt(student.is_active !== false),
  created_at: toIsoString(student.created_at, nowIso()),
});

const getAllStudents = () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM students").all();
  return rows.map((row) => normalizeStudentRow({ ...row }));
};

class StudentDocument {
  constructor(row) {
    Object.assign(this, row);
  }

  toSafeObject() {
    return {
      id: this._id,
      register_number: this.register_number,
      student_name: this.student_name,
      year_of_study: this.year_of_study,
      gender: this.gender,
      role: this.role,
      created_at: this.created_at,
    };
  }

  async save() {
    const db = getDb();
    const payload = serializeStudent(this);

    try {
      db.prepare(
        `
          UPDATE students
          SET register_number = :register_number,
              password_hash = :password_hash,
              student_name = :student_name,
              year_of_study = :year_of_study,
              gender = :gender,
              role = :role,
              is_active = :is_active,
              created_at = :created_at
          WHERE _id = :_id
        `,
      ).run(payload);
    } catch (error) {
      throw mapSqliteDuplicateError(error);
    }

    Object.assign(this, normalizeStudentRow(payload));
    return this;
  }

  async deleteOne() {
    const db = getDb();
    db.prepare("DELETE FROM students WHERE _id = ?").run(this._id);
  }
}

const wrapStudent = (row) => new StudentDocument(row);

const filterStudents = (filter = {}) =>
  getAllStudents().filter((student) => matchesFilter(student, filter));

export const Student = {
  find(filter = {}) {
    return createQuery({
      fetchRows: () => filterStudents(filter),
      wrap: wrapStudent,
    });
  },

  findOne(filter = {}) {
    return createQuery({
      fetchRows: () => filterStudents(filter),
      single: true,
      wrap: wrapStudent,
    });
  },

  findById(id) {
    return Student.findOne({ _id: id });
  },

  async create(data) {
    const db = getDb();
    const payload = serializeStudent({
      _id: createId(),
      register_number: data.register_number,
      password_hash: data.password_hash,
      student_name: data.student_name,
      year_of_study: data.year_of_study,
      gender: data.gender,
      role: data.role,
      is_active: data.is_active !== false,
      created_at: data.created_at || nowIso(),
    });

    try {
      db.prepare(
        `
          INSERT INTO students (
            _id, register_number, password_hash, student_name,
            year_of_study, gender, role, is_active, created_at
          ) VALUES (
            :_id, :register_number, :password_hash, :student_name,
            :year_of_study, :gender, :role, :is_active, :created_at
          )
        `,
      ).run(payload);
    } catch (error) {
      throw mapSqliteDuplicateError(error);
    }

    return wrapStudent(normalizeStudentRow(payload));
  },

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const existing = await Student.findOne(filter);

    if (!existing) {
      if (!options.upsert) {
        return null;
      }

      return Student.create({
        ...filter,
        ...update,
      });
    }

    Object.assign(existing, update);
    await existing.save();
    return existing;
  },
};
