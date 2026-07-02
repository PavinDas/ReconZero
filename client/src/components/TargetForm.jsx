import { Play, Square } from "lucide-react";
import { useState } from "react";

export default function TargetForm({ disabled, onStart, onStop, running, stopping }) {
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (running) {
        await onStop();
        return;
      }

      await onStart(target);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  return (
    <form className="terminal-panel p-4" onSubmit={submit}>
      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="target">
        target url
      </label>
      <input
        autoComplete="off"
        className="terminal-input"
        disabled={disabled}
        id="target"
        onChange={(event) => setTarget(event.target.value)}
        placeholder="https://example.com"
        spellCheck="false"
        type="url"
        value={target}
      />
      {error && <p className="mt-3 text-xs text-bad">{error}</p>}
      <button className={`primary-button mt-4 ${running ? "primary-button-danger" : ""}`} disabled={disabled && !running} type="submit">
        {running ? <Square size={16} /> : <Play size={16} />}
        {running ? "stop scan" : stopping ? "stopping" : "start scan"}
      </button>
    </form>
  );
}
