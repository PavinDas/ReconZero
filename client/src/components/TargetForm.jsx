import { Play } from "lucide-react";
import { useState } from "react";

export default function TargetForm({ disabled, onStart }) {
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
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
      <button className="primary-button mt-4" disabled={disabled} type="submit">
        <Play size={16} />
        {disabled ? "running" : "start scan"}
      </button>
    </form>
  );
}
