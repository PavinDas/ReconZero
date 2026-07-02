# ReconX

ReconX is a local reconnaissance dashboard for authorized web targets. It brings common discovery signals into one clean workspace: DNS records, HTTP headers, TLS metadata, page structure, exposed file paths, technology hints, and a downloadable JSON report.

It is built for fast first-pass inspection: start a scan, watch module progress in real time, stop it when needed, and keep the results easy to read.

## Highlights

- Live scan progress over Socket.IO
- DNS, headers, TLS, crawler, files, injection surface, technology, and WHOIS modules
- File and directory discovery with configurable wordlist limits
- JSON report export for completed scans
- React dashboard with a Node/Express API

## Tech Stack

- Client: React, Vite, Tailwind CSS, Framer Motion
- Server: Node.js, Express, Socket.IO
- Workspace: npm workspaces

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the server

Create a local environment file from the example:

```bash
cp server/.env.example server/.env
```

The defaults are ready for local development:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
FILE_WORDLIST_LIMIT=5000
FILE_SCAN_CONCURRENCY=12
FILE_SCAN_TIMEOUT_MS=5000
```

### 3. Start development mode

```bash
npm run dev
```

Open the dashboard at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000
```

## Usage

1. Enter a full target URL, such as `https://example.com`.
2. Start the scan from the dashboard.
3. Watch each module update as results arrive.
4. Use the stop button if you need to cancel an active scan.
5. Download the JSON report after completion.

## Scripts

```bash
npm run dev      # Start client and server together
npm run build    # Build the client
npm run lint     # Lint the client
npm start        # Start the server
```

## Responsible Use

ReconX is intended for assets you own or have explicit permission to assess. Keep scan limits reasonable, especially when using larger wordlists or higher concurrency.

## Creator

Created by **Pavin Das**.

- GitHub: [PavinDas](https://github.com/PavinDas)
- Profile: [pavindas.github.io](https://pavindas.github.io)
