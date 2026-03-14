import api from "./api";

export const creatorService = {
  listStudents: async () => {
    const { data } = await api.get("/creator/students");
    return data;
  },
  createStudent: async (payload) => {
    const { data } = await api.post("/creator/students", payload);
    return data;
  },
  updateStudent: async (id, payload) => {
    const { data } = await api.put(`/creator/students/${id}`, payload);
    return data;
  },
  deleteStudent: async (id) => {
    const { data } = await api.delete(`/creator/students/${id}`);
    return data;
  },
  getMappings: async () => {
    const { data } = await api.get("/creator/system-mapping");
    return data;
  },
  saveMapping: async (payload) => {
    const { data } = await api.post("/creator/system-mapping", payload);
    return data;
  },
  deleteMapping: async (seatLabel) => {
    const { data } = await api.delete(`/creator/system-mapping/${seatLabel}`);
    return data;
  },
  updateFemaleSeatProtection: async (enabled) => {
    const { data } = await api.patch("/creator/female-seat-protection", {
      enabled,
    });
    return data;
  },
  simulate: async (payload) => {
    const { data } = await api.post("/creator/simulate", payload);
    return data;
  },
};
