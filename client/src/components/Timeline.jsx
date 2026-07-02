export default function Timeline({ events }) {
  return (
    <div className="terminal-panel flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 shrink-0 text-xs uppercase tracking-[0.2em] text-slate-400">event stream</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1 text-xs">
        {events.length === 0 && <div className="text-slate-500">no packets yet</div>}
        {events.map((event, index) => (
          <div className="grid grid-cols-[68px_1fr] gap-2 border-l border-line/80 pl-2" key={`${event.at}-${index}`}>
            <span className="text-slate-500">{new Date(event.at).toLocaleTimeString()}</span>
            <span className={event.type.includes("error") ? "text-rose-300" : "text-emerald-300"}>
              {event.module ? `${event.module}: ` : ""}
              {event.message || event.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
