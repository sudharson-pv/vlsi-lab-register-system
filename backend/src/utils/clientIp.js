const normalize = (value) => {
  if (!value) {
    return "";
  }

  const primary = value.toString().split(",")[0].trim();
  return primary.replace(/^::ffff:/, "");
};

export const getClientIp = (req) =>
  normalize(req.headers["x-forwarded-for"]) ||
  normalize(req.headers["x-real-ip"]) ||
  normalize(req.socket?.remoteAddress) ||
  normalize(req.ip) ||
  "unknown";
