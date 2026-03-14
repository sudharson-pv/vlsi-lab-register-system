import api from "./api";

export const bookingService = {
  getSeatStatus: async () => {
    const { data } = await api.get("/seatStatus");
    return data;
  },
  getStudentBookings: async () => {
    const { data } = await api.get("/studentBookings");
    return data;
  },
  bookSystem: async (payload) => {
    const { data } = await api.post("/book", payload);
    return data;
  },
  cancelBooking: async (booking_id) => {
    const { data } = await api.post("/cancelBooking", { booking_id });
    return data;
  },
};
