const statusStyles = {
  available: "border-moss-400/30 bg-moss-400/12 text-moss-300 hover:bg-moss-400/20",
  booked: "border-rose-400/30 bg-rose-400/12 text-rose-200",
  blocked: "border-slate-700 bg-slate-950 text-white",
  female_reserved: "border-pink-400/40 bg-pink-400/18 text-pink-100 hover:bg-pink-400/24",
};

const helperText = (seat) => {
  if (seat.status === "blocked") {
    return seat.reason || "Blocked by admin";
  }

  if (seat.status === "female_reserved") {
    return "Reserved for female students";
  }

  if (seat.status === "booked") {
    return seat.student_name || "Booked";
  }

  return seat.system_id || "Unmapped";
};

const SeatGrid = ({
  sections = [],
  selectedSeat,
  onSelect,
  selectableStatuses = ["available"],
  readOnly = false,
}) => {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="panel-muted p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">{section.title}</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {section.seats.length} seats
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {section.seats.map((seat) => {
              const isSelected = selectedSeat === seat.seat_id;
              const canSelect = selectableStatuses.includes(seat.status) || isSelected;

              return (
                <button
                  key={seat.seat_id}
                  type="button"
                  disabled={readOnly ? false : !canSelect}
                  onClick={() => (readOnly ? null : onSelect?.(seat))}
                  className={`rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-cyanlab-400 bg-cyanlab-400 text-slate-950"
                      : statusStyles[seat.status]
                  } ${!readOnly && !canSelect ? "cursor-not-allowed opacity-65" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold">{seat.seat_id}</span>
                    <span className="text-[10px] uppercase tracking-[0.16em]">
                      Row {seat.row_number}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] opacity-80">{helperText(seat)}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeatGrid;
