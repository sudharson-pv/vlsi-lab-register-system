const LoadingState = ({ label = "Loading dashboard..." }) => {
  return (
    <div className="panel-surface flex min-h-[240px] items-center justify-center p-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyanlab-400" />
        <p className="text-sm text-slate-300">{label}</p>
      </div>
    </div>
  );
};

export default LoadingState;
