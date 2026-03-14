const Panel = ({ title, eyebrow, children, actions, className = "" }) => {
  return (
    <section className={`panel-surface animate-rise p-6 ${className}`.trim()}>
      {(title || eyebrow || actions) && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {eyebrow ? (
              <span className="badge border-cyanlab-400/30 bg-cyanlab-400/10 text-cyanlab-300">
                {eyebrow}
              </span>
            ) : null}
            {title ? (
              <h2 className="mt-3 font-display text-xl font-semibold text-white">
                {title}
              </h2>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
};

export default Panel;
