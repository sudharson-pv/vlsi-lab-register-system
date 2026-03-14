import api from "./api";

export const authService = {
  login: async (payload) => {
    const { data } = await api.post("/login", payload);
    return data;
  },
  me: async () => {
    const { data } = await api.get("/me");
    return data;
  },
};
