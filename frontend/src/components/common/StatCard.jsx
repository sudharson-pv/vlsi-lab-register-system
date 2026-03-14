const tones = {
  cyan: "border-cyanlab-400/30 bg-cyanlab-400/10 text-cyanlab-300",
  amber: "border-copper-400/30 bg-copper-400/10 text-copper-300",
  green: "border-moss-400/30 bg-moss-400/10 text-moss-300",
  red: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const StatCard = ({ label, value, helper, tone = "cyan" }) => {
  return (
    <div className="panel-muted p-5">
      <span className={`badge ${tones[tone] || tones.cyan}`}>{label}</span>
      <p className="mt-4 font-display text-3xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-300">{helper}</p> : null}
    </div>
  );
};

export default StatCard;
