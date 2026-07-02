import { Activity, Download, ExternalLink, Radar, ShieldCheck, Terminal } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startScan } from "./services/api.js";
import { useScanSocket } from "./hooks/useScanSocket.js";
import StatusPill from "./components/StatusPill.jsx";
import ModulePanel from "./components/ModulePanel.jsx";
import TargetForm from "./components/TargetForm.jsx";
import Timeline from "./components/Timeline.jsx";

const modules = ["dns", "headers", "tls", "crawler", "files", "technology", "whois"];

export default function App() {
  const [scan, setScan] = useState(null);
  const [activeModule, setActiveModule] = useState("dns");
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleScanEvent = useCallback((event) => {
    setEvents((current) => [event, ...current].slice(0, 80));
    if (event.type === "module:done" || event.type === "module:error") {
      setResults((current) => ({ ...current, [event.module]: event.result }));
    }
    if (event.type === "scan:complete") setStatus("complete");
    if (event.type === "scan:error") {
      setStatus("failed");
      setError(event.message);
    }
  }, []);

  useScanSocket(scan?.id, { onEvent: handleScanEvent });

  const completed = Object.keys(results).length;
  const progress = useMemo(() => Math.round((completed / modules.length) * 100), [completed]);

  async function handleStart(target) {
    setStatus("running");
    setError("");
    setEvents([]);
    setResults({});
    setActiveModule("dns");
    const response = await startScan(target);
    setScan(response);
  }

  return (
    <main className="min-h-screen bg-ink text-slate-100 font-mono selection:bg-acid selection:text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-line/70 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-cyan-300">
              <Terminal size={14} />
              local passive recon
            </div>
            <h1 className="text-4xl font-black leading-none text-slate-50 sm:text-6xl">ReconX</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Fast local reconnaissance with readable findings, live module progress, and exportable reports.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
            <StatusPill label="mode" value="authorized" icon={ShieldCheck} />
            <StatusPill label="status" value={status} icon={Activity} tone={status} />
            <StatusPill label="modules" value={`${completed}/${modules.length}`} icon={Radar} />
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <TargetForm disabled={status === "running"} onStart={handleStart} />
            <div className="terminal-panel p-5">
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-400">
                <span>progress</span>
                <span className="text-cyan-300">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-950">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-300"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {modules.map((name) => (
                  <button
                    className={`module-tab ${activeModule === name ? "module-tab-active" : ""}`}
                    key={name}
                    onClick={() => setActiveModule(name)}
                    type="button"
                  >
                    <span className={results[name]?.error ? "text-rose-300" : results[name] ? "text-emerald-300" : "text-slate-500"}>
                      {results[name]?.error ? "ERR" : results[name] ? "OK" : "WAIT"}
                    </span>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <Timeline events={events} />
          </aside>

          <section className="terminal-panel min-h-[680px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
              <div className="truncate text-sm text-slate-400">
                target: <span className="text-cyan-200">{scan?.target || "awaiting input"}</span>
              </div>
              {scan?.id && (
                <a className="icon-button" href={`/api/reports/${scan.id}/json`} title="Download JSON">
                  <Download size={16} />
                </a>
              )}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                key={activeModule}
              >
                {error && <div className="mb-4 border border-bad p-3 text-sm text-bad">{error}</div>}
                <ModulePanel moduleName={activeModule} result={results[activeModule]} running={status === "running"} />
              </motion.div>
            </AnimatePresence>
            {scan?.target && (
              <div className="border-t border-line/70 px-6 py-4 text-xs text-slate-500">
                <ExternalLink className="mr-2 inline" size={13} />
                only scan assets you own or have explicit permission to assess
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
