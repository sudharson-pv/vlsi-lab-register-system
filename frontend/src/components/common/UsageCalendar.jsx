import { formatShortDate } from "../../utils/formatters";

const buildWindow = () => {
  const today = new Date();
  const days = [];

  for (let index = 41; index >= 0; index -= 1) {
    const value = new Date(today);
    value.setDate(today.getDate() - index);
    days.push(value);
  }

  return days;
};

const intensityClass = (minutes) => {
  if (!minutes) {
    return "bg-white/5 border-white/5";
  }
  if (minutes < 60) {
    return "bg-cyanlab-400/20 border-cyanlab-400/25";
  }
  if (minutes < 120) {
    return "bg-copper-400/30 border-copper-400/35";
  }
  return "bg-moss-400/35 border-moss-400/40";
};

const UsageCalendar = ({ usage = [] }) => {
  const usageMap = new Map(usage.map((entry) => [entry.date, entry.total_minutes]));
  const days = buildWindow();

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 sm:[grid-template-columns:repeat(14,minmax(0,1fr))]">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const minutes = usageMap.get(key) || 0;

          return (
            <div
              key={key}
              title={`${key} - ${minutes} minutes`}
              className={`aspect-square rounded-xl border ${intensityClass(minutes)}`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span>Less</span>
        <span className="h-3 w-3 rounded border border-white/10 bg-white/5" />
        <span className="h-3 w-3 rounded border border-cyanlab-400/25 bg-cyanlab-400/20" />
        <span className="h-3 w-3 rounded border border-copper-400/35 bg-copper-400/30" />
        <span className="h-3 w-3 rounded border border-moss-400/40 bg-moss-400/35" />
        <span>More</span>
      </div>
      <p className="mt-3 text-xs text-slate-400">Recent 42-day usage view. Latest day: {formatShortDate(new Date())}</p>
    </div>
  );
};

export default UsageCalendar;
