export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatShortDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

export const formatDuration = (minutes = 0) => {
  if (!minutes) {
    return "0m";
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) {
    return `${remaining}m`;
  }

  if (!remaining) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
};

export const toLocalInputValue = (date) => {
  const target = new Date(date);
  const offset = target.getTimezoneOffset() * 60000;
  return new Date(target.getTime() - offset).toISOString().slice(0, 16);
};

export const getHomeRoute = (role) => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "creator") {
    return "/creator";
  }

  return "/student";
};
