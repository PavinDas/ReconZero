import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function ModulePanel({ moduleName, result, running }) {
  if (!result) {
    return (
      <div className="empty-state">
        {running ? <Loader2 className="animate-spin" size={22} /> : null}
        <div>
          <div className="text-base text-slate-100">{running ? `Scanning ${label(moduleName)}` : "Ready for scan"}</div>
          <div className="mt-1 text-sm text-slate-400">
            {running ? "Results will appear here as soon as this module finishes." : "Enter a target URL to begin."}
          </div>
        </div>
      </div>
    );
  }

  if (result.error) {
    return (
      <div>
        <PanelTitle title={label(moduleName)} subtitle="Module did not complete" />
        <Callout tone="bad" title="Unable to collect data" value={result.error} />
        {result.partial ? <GenericObject data={result.partial} /> : null}
      </div>
    );
  }

  const renderers = {
    dns: <DnsResult result={result} />,
    headers: <HeadersResult result={result} />,
    tls: <TlsResult result={result} />,
    crawler: <CrawlerResult result={result} />,
    files: <FilesResult result={result} running={running} />,
    injection: <InjectionResult result={result} />,
    technology: <TechnologyResult result={result} />,
    whois: <WhoisResult result={result} />
  };

  return renderers[moduleName] || <GenericObject data={result} />;
}

function DnsResult({ result }) {
  return (
    <div>
      <PanelTitle title="DNS Intelligence" subtitle={result.hostname} />
      <MetricGrid
        items={[
          ["A Records", result.a?.length || 0],
          ["AAAA Records", result.aaaa?.length || 0],
          ["Name Servers", result.ns?.length || 0],
          ["Mail Servers", result.mx?.length || 0]
        ]}
      />
      <Section title="Address Records">
        <TagList items={[...(result.a || []), ...(result.aaaa || [])]} empty="No address records found." />
      </Section>
      <Section title="Name Servers">
        <TagList items={result.ns || []} empty="No name servers found." />
      </Section>
      <Section title="Mail Exchange">
        <SimpleTable
          columns={["Priority", "Exchange"]}
          rows={(result.mx || []).map((item) => [item.priority, item.exchange])}
          empty="No MX records found."
        />
      </Section>
      <Section title="TXT Records">
        <TagList items={(result.txt || []).map((item) => item.join(" "))} empty="No TXT records found." />
      </Section>
      <Section title="Authority">
        <KeyValues
          data={{
            primary: result.soa?.nsname,
            admin: result.soa?.hostmaster,
            serial: result.soa?.serial
          }}
        />
      </Section>
      <Section title="CAA Records">
        <SimpleTable
          columns={["Flag", "Tag", "Value"]}
          rows={(result.caa || []).map((item) => [item.critical, item.issue || item.issuewild || item.iodef || item.tag, item.value])}
          empty="No CAA records found."
        />
      </Section>
    </div>
  );
}

function HeadersResult({ result }) {
  const securityRows = Object.entries(result.securityHeaders || {}).map(([name, value]) => [
    readableHeader(name),
    value ? "Present" : "Missing",
    value ? "ok" : "warn"
  ]);

  return (
    <div>
      <PanelTitle title="HTTP Response" subtitle={result.finalUrl} />
      <MetricGrid
        items={[
          ["Status", result.status],
          ["Response Time", `${result.responseTimeMs || 0} ms`],
          ["Redirects", result.redirects?.length || 0],
          ["Headers", Object.keys(result.headers || {}).length]
        ]}
      />
      <Section title="Security Headers">
        <StatusTable rows={securityRows} />
      </Section>
      <Section title="Server Signals">
        <KeyValues
          data={{
            server: result.headers?.server,
            "x-powered-by": result.headers?.["x-powered-by"],
            "content-type": result.headers?.["content-type"],
            "cache-control": result.headers?.["cache-control"]
          }}
        />
      </Section>
      <Section title="Redirect Chain">
        <TagList items={result.redirects || []} empty="No redirects observed." />
      </Section>
    </div>
  );
}

function TlsResult({ result }) {
  if (!result.enabled) {
    return (
      <div>
        <PanelTitle title="TLS Certificate" subtitle="HTTPS not detected" />
        <Callout tone="warn" title="TLS unavailable" value={result.reason} />
      </div>
    );
  }

  return (
    <div>
      <PanelTitle title="TLS Certificate" subtitle={result.subject?.CN || "Certificate details"} />
      <MetricGrid
        items={[
          ["Protocol", result.protocol || "unknown"],
          ["Days Left", result.daysRemaining ?? "unknown"],
          ["Issuer", result.issuer?.O || result.issuer?.CN || "unknown"],
          ["SANs", result.subjectAltNames?.length || 0]
        ]}
      />
      <Section title="Validity">
        <KeyValues data={{ "valid from": result.validFrom, "valid to": result.validTo, fingerprint: result.fingerprint256 }} />
      </Section>
      <Section title="Subject Alternative Names">
        <TagList items={result.subjectAltNames || []} empty="No SAN values exposed." />
      </Section>
      <Section title="Cipher">
        <KeyValues data={result.cipher || {}} />
      </Section>
    </div>
  );
}

function CrawlerResult({ result }) {
  return (
    <div>
      <PanelTitle title="Page Discovery" subtitle={result.title || "Untitled page"} />
      <MetricGrid
        items={[
          ["Internal Links", result.counts?.internalLinks || 0],
          ["External Links", result.counts?.externalLinks || 0],
          ["Scripts", result.scripts?.length || 0],
          ["Forms", result.forms?.length || 0]
        ]}
      />
      <Section title="Page Metadata">
        <KeyValues data={{ title: result.title, description: result.description, canonical: result.canonical, language: result.language }} />
      </Section>
      <Section title="Forms">
        <SimpleTable
          columns={["Method", "Action", "Inputs"]}
          rows={(result.forms || []).map((form) => [form.method, form.action || "/", form.inputs?.length || 0])}
          empty="No forms detected."
        />
      </Section>
      <Section title="Internal Links">
        <TagList items={result.internalLinks || []} empty="No internal links discovered." />
      </Section>
      <Section title="External Links">
        <TagList items={result.externalLinks || []} empty="No external links discovered." />
      </Section>
    </div>
  );
}

function FilesResult({ result, running }) {
  const total = result.total || result.scanned || 0;
  const isRunning = running && result.status === "running";

  return (
    <div>
      <PanelTitle title="File and Path Discovery" subtitle={result.wordlistPath || "Configured wordlist"} />
      <MetricGrid
        items={[
          ["Scanned", total ? `${result.scanned || 0}/${total}` : result.scanned || 0],
          ["Found", result.matches?.length || 0],
          ["Concurrency", result.concurrency || "-"],
          ["Total Bytes", result.matches?.reduce((sum, item) => sum + (item.size || 0), 0) || 0]
        ]}
      />
      {isRunning ? <p className="live-line">Live discovery running</p> : null}
      <Section title="Discovered Paths">
        <SimpleTable
          columns={["Path", "Status", "Size", "Time", "Type"]}
          rows={(result.matches || []).map((item) => [
            <a className="table-link" href={item.url || item.finalUrl} key={item.path} rel="noreferrer" target="_blank">
              {item.path}
            </a>,
            item.status,
            item.size || 0,
            `${item.responseTimeMs || 0} ms`,
            item.kind === "directory" ? "directory" : item.contentType || "-"
          ])}
          empty="No non-4xx paths discovered."
        />
      </Section>
      <Section title="Interesting Findings">
        <TagList items={result.findings || []} empty="No notable directives found." />
      </Section>
    </div>
  );
}

function InjectionResult({ result }) {
  return (
    <div>
      <PanelTitle title="Injection Input Points" subtitle="URLs and forms with user-controlled parameters" />
      <MetricGrid
        items={[
          ["Endpoints", result.endpoints?.length || 0],
          ["Parameters", result.parameterCount || 0],
          ["Links Checked", result.scanned?.links || 0],
          ["Forms Checked", result.scanned?.forms || 0]
        ]}
      />
      <Section title="Candidate Endpoints">
        <SimpleTable
          columns={["Endpoint", "Method", "Type", "Parameters", "Source"]}
          rows={(result.endpoints || []).map((item) => [
            <a className="table-link" href={item.url} key={item.url} rel="noreferrer" target="_blank">
              {item.path}
            </a>,
            item.method,
            item.type,
            item.parameters?.join(", ") || "-",
            item.source
          ])}
          empty="No URLs with parameters or forms with named inputs found."
        />
      </Section>
    </div>
  );
}

function TechnologyResult({ result }) {
  return (
    <div>
      <PanelTitle title="Technology Fingerprint" subtitle="Detected from headers, markup, scripts and cookies" />
      <MetricGrid
        items={[
          ["Hints", result.hints?.length || 0],
          ["Cookies", result.cookies?.length || 0],
          ["Meta Tags", result.meta?.length || 0],
          ["Generators", result.generators?.length || 0]
        ]}
      />
      <Section title="Detected Hints">
        <TagList items={result.hints || []} empty="No clear technology hints detected." />
      </Section>
      <Section title="Cookies">
        <TagList items={result.cookies || []} empty="No cookies observed." />
      </Section>
      <Section title="Meta Signals">
        <SimpleTable
          columns={["Name", "Content"]}
          rows={(result.meta || []).map((item) => [item.name, item.content])}
          empty="No metadata signals found."
        />
      </Section>
    </div>
  );
}

function WhoisResult({ result }) {
  return (
    <div>
      <PanelTitle title="WHOIS Registration" subtitle={result.domainName || "Domain ownership metadata"} />
      <MetricGrid
        items={[
          ["Registrar", result.registrar || "unknown"],
          ["Created", shortDate(result.creationDate)],
          ["Expires", shortDate(result.expirationDate)],
          ["Statuses", result.status?.length || 0]
        ]}
      />
      <Section title="Registration Dates">
        <KeyValues
          data={{
            created: result.creationDate,
            updated: result.updatedDate,
            expires: result.expirationDate
          }}
        />
      </Section>
      <Section title="Name Servers">
        <TagList items={result.nameServers || []} empty="No WHOIS name servers found." />
      </Section>
      <Section title="Domain Status">
        <TagList items={result.status || []} empty="No WHOIS status values found." />
      </Section>
    </div>
  );
}

function PanelTitle({ subtitle, title }) {
  return (
    <div className="mb-6">
      <div className="eyebrow">module result</div>
      <h2 className="mt-2 text-2xl font-bold text-slate-50">{title}</h2>
      {subtitle ? <p className="mt-1 break-words text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <div className="result-grid">
      {items.map(([name, value]) => (
        <div className="metric-card" key={name}>
          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{name}</div>
          <div className="mt-2 truncate text-xl font-semibold text-slate-50">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ children, title }) {
  return (
    <section className="result-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function TagList({ empty, items }) {
  const cleanItems = (items || []).filter(Boolean);
  if (cleanItems.length === 0) return <p className="muted-line">{empty}</p>;
  return (
    <div className="tag-list">
      {cleanItems.map((item) => (
        <span className="data-tag" key={String(item)}>
          {String(item)}
        </span>
      ))}
    </div>
  );
}

function SimpleTable({ columns, empty, rows }) {
  if (!rows || rows.length === 0) return <p className="muted-line">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>
                  <div className="table-cell-scroll">{renderCell(cell)}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(cell) {
  if (cell === 0) return "0";
  if (cell === undefined || cell === null || cell === "") return "-";
  return cell;
}

function StatusTable({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map(([name, value, tone]) => (
        <div className="status-row" key={name}>
          {tone === "ok" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          <span>{name}</span>
          <strong className={tone === "ok" ? "text-emerald-300" : "text-amber-300"}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function KeyValues({ data }) {
  const entries = Object.entries(data || {}).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return <p className="muted-line">No values available.</p>;
  return (
    <div className="key-values">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{key}</span>
          <strong>{Array.isArray(value) ? value.join(", ") : String(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function Callout({ title, tone, value }) {
  return (
    <div className={`callout callout-${tone}`}>
      <AlertTriangle size={18} />
      <div>
        <strong>{title}</strong>
        <p>{value}</p>
      </div>
    </div>
  );
}

function GenericObject({ data }) {
  return (
    <Section title="Raw Details">
      <pre className="result-block">{JSON.stringify(data, null, 2)}</pre>
    </Section>
  );
}

function label(value) {
  return value.replaceAll("-", " ").replace(/^\w/, (char) => char.toUpperCase());
}

function readableHeader(value) {
  return value.replace(/[A-Z]/g, (char) => ` ${char}`).replace(/^\w/, (char) => char.toUpperCase());
}

function shortDate(value) {
  if (!value) return "unknown";
  return String(value).slice(0, 10);
}
