const items = [
  { label: "Available", className: "bg-moss-400" },
  { label: "Booked", className: "bg-rose-400" },
  { label: "Blocked by admin", className: "bg-slate-950 border border-slate-600" },
  { label: "Female reserved row", className: "bg-pink-400" },
  { label: "Selected", className: "bg-cyanlab-400" },
];

const SeatLegend = () => {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${item.className}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default SeatLegend;
