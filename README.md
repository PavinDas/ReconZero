# ReconZero

> A web reconnaissance tool that gives you real-time results and clear reports.

ReconZero is a local, automated reconnaissance dashboard built for web security assessments. It consolidates multiple intelligence-gathering phases into a single, seamless React-based workspace. From DNS profiling to active vulnerability scanning, it delivers findings in real time with high readability and exportability.

---

## ✨ Features

- **Real-Time Execution Engine:** Modules stream data live via WebSocket as they run.
- **Vulnerability Scanning (Nikto):** Integrated vulnerability assessment with live terminal streaming, automatic severity classification (Critical, High, Medium, Info), and clickable CVE/CWE references.
- **Subdomain Enumeration:** Concurrent, wordlist-driven DNS resolution for target discovery.
- **Directory & File Discovery:** Fast, asynchronous path scanning with configurable limits.
- **Comprehensive Analysis:** Modules for DNS, HTTP Headers, TLS Certificates, Web Crawling, WHOIS, Technology Fingerprinting, and Injection Point discovery.
- **Exportable Reporting:** Download full JSON reports for the entire scan, or grab individual module results (per-tab downloads) on the fly.
- **Polished UI:** A dark-themed, intuitive dashboard built with Tailwind CSS and Framer Motion for a premium developer experience.

## 🛠 Tech Stack

- **Client:** React, Vite, Tailwind CSS, Framer Motion
- **Server:** Node.js, Express, Socket.IO
- **Tools:** `nikto` (external dependency for vulnerability module)

## 🚀 Getting Started

### 1. Prerequisites

You will need **Node.js** (v18+) and **npm**.
The vulnerability scanning module requires the **Nikto** security scanner to be installed on your host system.

**Debian/Ubuntu:**
```bash
sudo apt update && sudo apt install nikto
```

### 2. Install Dependencies

Clone the repository and install the Node workspaces:

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file to configure your local setup:

```bash
cp server/.env.example server/.env
```

**Default `.env` configuration:**
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
FILE_WORDLIST_LIMIT=5000
FILE_SCAN_CONCURRENCY=12
FILE_SCAN_TIMEOUT_MS=5000
# SUBDOMAIN_CONCURRENCY=30
# NIKTO_MAXTIME=120s
```

### 4. Run the Application

Start both the backend API and the frontend dashboard concurrently in development mode:

```bash
npm run dev
```

- **Dashboard UI:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:4000](http://localhost:4000)

## 📖 Usage Guide

1. **Launch the Dashboard:** Open the UI in your web browser.
2. **Define Target:** Enter the full URL of the target application (e.g., `https://example.com`).
3. **Start Scan:** Click the play button. The scan will trigger multiple concurrent modules.
4. **Monitor Live Progress:** Navigate through the module tabs to see data arriving in real time. The **Vulns** and **Files** tabs feature a live terminal output view.
5. **Analyze Results:** Findings are automatically parsed, categorized, and presented. URLs and references are highly clickable for quick pivoting.
6. **Export Data:** Click the download icon in the header to save a comprehensive JSON report of the entire scan, or use the tab-specific download button to export data for the active module only.

## ⚖️ Responsible Use

**ReconZero** is designed solely for assets you own or have explicit, documented authorization to test. 
Keep your scan concurrency and wordlists at reasonable limits to prevent unintended service degradation. The creators are not responsible for misuse or damage caused by this software.

## 👨‍💻 Creator

Built by **Pavin Das** — Ethical Hacker & Web Application Tester.

- **GitHub:** [PavinDas](https://github.com/PavinDas)
- **Profile:** [pavindas.github.io](https://pavindas.github.io)
