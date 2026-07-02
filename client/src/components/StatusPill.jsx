export default function StatusPill({ icon: Icon, label, tone = "", value }) {
  return (
    <div className={`status-pill ${tone === "failed" ? "status-pill-bad" : ""}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-teal">
        <Icon size={12} />
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-mint">{value}</div>
    </div>
  );
}
