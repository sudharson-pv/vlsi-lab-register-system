export const SEATS_PER_ROW = 4;

export const LINUX_SEATS = Array.from({ length: 36 }, (_, index) => `L${index + 1}`);
export const WINDOWS_SEATS = Array.from(
  { length: 36 },
  (_, index) => `W${index + 1}`,
);

export const ALL_SEATS = [...LINUX_SEATS, ...WINDOWS_SEATS];

export const SEAT_LAYOUT = [
  { id: "linux", title: "Linux Systems", seats: LINUX_SEATS },
  { id: "windows", title: "Windows Systems", seats: WINDOWS_SEATS },
];

export const isValidSeat = (seatId = "") =>
  ALL_SEATS.includes(seatId.toUpperCase());

export const getSeatSection = (seatId = "") =>
  seatId.toUpperCase().startsWith("L") ? "Linux" : "Windows";

export const getSeatPrefix = (seatId = "") => seatId.toUpperCase().charAt(0);

export const getSeatNumber = (seatId = "") =>
  Number.parseInt(seatId.toUpperCase().slice(1), 10) || 0;

export const getRowNumber = (seatId = "") =>
  Math.max(1, Math.ceil(getSeatNumber(seatId) / SEATS_PER_ROW));

export const getRowId = (seatId = "") =>
  `${getSeatPrefix(seatId)}-${getRowNumber(seatId)}`;

export const getRowLabel = (seatId = "") =>
  `${getSeatSection(seatId)} Row ${getRowNumber(seatId)}`;

export const getSeatsInRow = (seatId = "") => {
  const prefix = getSeatPrefix(seatId);
  const rowNumber = getRowNumber(seatId);
  const start = (rowNumber - 1) * SEATS_PER_ROW + 1;

  return Array.from({ length: SEATS_PER_ROW }, (_, index) => `${prefix}${start + index}`);
};
