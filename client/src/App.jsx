import { Activity, Download, ExternalLink, Radar, ShieldCheck, Terminal } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startScan, stopScan } from "./services/api.js";
import { useScanSocket } from "./hooks/useScanSocket.js";
import StatusPill from "./components/StatusPill.jsx";
import ModulePanel from "./components/ModulePanel.jsx";
import TargetForm from "./components/TargetForm.jsx";
import Timeline from "./components/Timeline.jsx";

const modules = ["dns", "headers", "tls", "crawler", "files", "injection", "technology", "whois", "subdomains", "vulns"];

export default function App() {
  const [scan, setScan] = useState(null);
  const [activeModule, setActiveModule] = useState("dns");
  const [events, setEvents] = useState([]);
  const [results, setResults] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [reportPath, setReportPath] = useState(null);

  const handleScanEvent = useCallback((event) => {
    setEvents((current) => [event, ...current].slice(0, 80));
    if (event.type === "module:update") {
      setResults((current) => ({ ...current, [event.module]: mergeModuleResult(current[event.module], event.result) }));
    }
    if (event.type === "module:done" || event.type === "module:error") {
      setResults((current) => ({ ...current, [event.module]: event.result }));
    }
    if (event.type === "scan:complete") {
      setStatus("complete");
      if (event.report) setReportPath(event.report);
    }
    if (event.type === "scan:stopped") setStatus("stopped");
    if (event.type === "scan:error") {
      setStatus("failed");
      setError(event.message);
    }
  }, []);

  useScanSocket(scan?.id, { onEvent: handleScanEvent });

  const completed = modules.filter((name) => results[name] && results[name].status !== "running").length;
  const progress = useMemo(() => Math.round((completed / modules.length) * 100), [completed]);

  async function handleStart(target) {
    setStatus("running");
    setError("");
    setEvents([]);
    setResults({});
    setReportPath(null);
    setActiveModule("dns");
    const response = await startScan(target);
    setScan(response);
  }

  async function handleStop() {
    if (!scan?.id) return;
    setStatus("stopping");
    try {
      await stopScan(scan.id);
    } catch (err) {
      setStatus("running");
      throw err;
    }
  }

  return (
    <main className="h-dvh w-dvw overflow-hidden bg-void text-mint font-sans selection:bg-mint selection:text-void">
      <section className="flex h-full w-full flex-col gap-5 overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <header className="shrink-0 border-b border-forest/70 pb-4">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-teal">
                <Terminal size={14} />
                <span>
                  by{" "}
                  <a className="hover:text-mint transition-colors" href="https://pavindas.github.io" rel="noreferrer" target="_blank">
                    PavinDas
                  </a>
                </span>
              </div>
              <h1 className="text-4xl font-black leading-none text-mint sm:text-6xl">ReconZero</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-teal">
                A web reconnaissance tool that gives you real-time results and clear reports.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-teal">
              <StatusPill label="status" value={status} icon={Activity} tone={status} />
              <StatusPill label="modules" value={`${completed}/${modules.length}`} icon={Radar} />
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-5 overflow-hidden">
            <TargetForm
              disabled={status === "running" || status === "stopping"}
              onStart={handleStart}
              onStop={handleStop}
              running={status === "running"}
              stopping={status === "stopping"}
            />
            <div className="terminal-panel shrink-0 p-5">
              <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-teal">
                <span>progress</span>
                <span className="text-teal">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-void">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-forest via-teal to-mint"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {modules.map((name) => {
                  const moduleStatus = getModuleStatus(results[name]);
                  return (
                    <button
                      className={`module-tab ${activeModule === name ? "module-tab-active" : ""}`}
                      key={name}
                      onClick={() => setActiveModule(name)}
                      type="button"
                    >
                      <span className={moduleStatus.className}>{moduleStatus.label}</span>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Timeline events={events} />
          </aside>

          <section className="terminal-panel flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-forest/70 px-6 py-4">
              <div className="truncate text-sm text-teal">
                target: <span className="text-mint">{scan?.target || "awaiting input"}</span>
              </div>
              {/* Full-report download — only available after scan completes */}
              {reportPath && (
                <button
                  className="icon-button"
                  onClick={() => downloadReport(reportPath, scan?.id)}
                  title="Download full JSON report"
                  type="button"
                >
                  <Download size={16} />
                </button>
              )}
              {/* Per-tab module download — always available when a module has results */}
              {results[activeModule] && (
                <button
                  className="icon-button"
                  onClick={() => downloadModuleResult(results[activeModule], activeModule, scan?.id)}
                  title={`Download ${activeModule} results as JSON`}
                  type="button"
                >
                  <Download size={14} />
                </button>
              )}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="result-scroll min-h-0 flex-1 overflow-auto p-6"
                exit={{ opacity: 0, y: 8 }}
                initial={{ opacity: 0, y: 8 }}
                key={activeModule}
              >
                {error && <div className="mb-4 border border-teal p-3 text-sm text-mint">{error}</div>}
                <ModulePanel moduleName={activeModule} result={results[activeModule]} running={status === "running"} />
              </motion.div>
            </AnimatePresence>
            {scan?.target && (
              <div className="shrink-0 border-t border-forest/70 px-6 py-4 text-xs text-teal">
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

function mergeModuleResult(previous = {}, incoming = {}) {
  if (!incoming.append) {
    return {
      ...previous,
      ...incoming,
      matches: incoming.matches?.length ? incoming.matches : previous.matches || incoming.matches || [],
      findings: incoming.findings?.length ? mergeUnique(previous.findings, incoming.findings) : previous.findings || incoming.findings || [],
      found: incoming.found?.length ? incoming.found : previous.found || incoming.found || [],
      ipSet: incoming.ipSet?.length ? mergeUnique(previous.ipSet, incoming.ipSet) : previous.ipSet || incoming.ipSet || [],
      // vulns: always take incoming liveLines (they are the latest terminal window); merge vulnerabilities
      liveLines: incoming.liveLines ?? previous.liveLines ?? [],
      vulnerabilities: incoming.vulnerabilities?.length ? mergeVulns(previous.vulnerabilities, incoming.vulnerabilities) : previous.vulnerabilities || [],
      grouped: incoming.grouped ?? previous.grouped ?? {}
    };
  }

  const matches = mergeMatches(previous.matches, incoming.matches);
  const found = mergeSubdomains(previous.found, incoming.found);
  return {
    ...previous,
    ...incoming,
    append: undefined,
    matches,
    findings: mergeUnique(previous.findings, incoming.findings),
    found,
    ipSet: mergeUnique(previous.ipSet, incoming.ipSet),
    liveLines: incoming.liveLines ?? previous.liveLines ?? [],
    vulnerabilities: mergeVulns(previous.vulnerabilities, incoming.vulnerabilities),
    grouped: incoming.grouped ?? previous.grouped ?? {}
  };
}

function mergeMatches(previous = [], incoming = []) {
  const byPath = new Map();
  for (const item of previous) byPath.set(item.path, item);
  for (const item of incoming) byPath.set(item.path, item);
  return Array.from(byPath.values()).sort((a, b) => (a.status || 0) - (b.status || 0) || a.path.localeCompare(b.path));
}

function mergeSubdomains(previous = [], incoming = []) {
  const byName = new Map();
  for (const item of previous) byName.set(item.subdomain, item);
  for (const item of incoming) byName.set(item.subdomain, item);
  return Array.from(byName.values()).sort((a, b) => a.subdomain.localeCompare(b.subdomain));
}

function mergeUnique(previous = [], incoming = []) {
  return Array.from(new Set([...(previous || []), ...(incoming || [])])).slice(0, 80);
}

function mergeVulns(previous = [], incoming = []) {
  const byKey = new Map();
  for (const item of (previous || [])) byKey.set(`${item.url}|${item.msg}`, item);
  for (const item of (incoming || [])) byKey.set(`${item.url}|${item.msg}`, item);
  return Array.from(byKey.values());
}

function getModuleStatus(result) {
  if (result?.error) return { className: "text-mint", label: "ERR" };
  if (result?.status === "running") return { className: "text-teal", label: "LIVE" };
  if (result) return { className: "text-mint", label: "OK" };
  return { className: "text-teal", label: "WAIT" };
}

function downloadReport(reportPath, scanId) {
  if (!reportPath || !scanId) return;
  fetch(reportPath)
    .then((response) => {
      if (!response.ok) throw new Error("Report not found");
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `reconzero-${scanId}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    })
    .catch((error) => alert(error.message));
}

function downloadModuleResult(result, moduleName, scanId) {
  if (!result || !scanId) return;
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `reconzero-${scanId}-${moduleName}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}
