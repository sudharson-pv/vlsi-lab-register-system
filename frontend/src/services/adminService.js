import api from "./api";

export const adminService = {
  getDashboard: async () => {
    const { data } = await api.get("/adminDashboard");
    return data;
  },
  blockSystem: async (payload) => {
    const { data } = await api.post("/admin/block-system", payload);
    return data;
  },
  unblockSystem: async (seatId) => {
    const { data } = await api.delete(`/admin/block-system/${seatId}`);
    return data;
  },
  toggleMaintenance: async (maintenance_mode) => {
    const { data } = await api.patch("/admin/maintenance", {
      maintenance_mode,
    });
    return data;
  },
};
