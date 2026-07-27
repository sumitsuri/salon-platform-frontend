# Antrahq — Frontend

Next.js web app for the Antrahq ops platform — manager walk-in flow, brand admin dashboard, Market Pulse intelligence, and platform admin.

**Antrahq** helps multi-location operators run billing, teams, and customer relationships from one connected system — built in India for growing local chains.

## Tech Stack

- Next.js 15, TypeScript
- Tailwind CSS
- TanStack Query, Zustand

## Quick Start

```bash
npm install
npm run dev
```

App: http://localhost:3000

### Environment

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend (default `http://localhost:8080`).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

Backend: [salon-platform-backend](https://github.com/sumitsuri/salon-platform-backend)
