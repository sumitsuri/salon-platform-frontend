# Salon Platform — Frontend

Next.js web app for salon chain management — manager walk-in flow, brand admin dashboard, and platform admin.

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

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## App Areas

| Route | Role |
|-------|------|
| `/login` | All users |
| `/manager` | Branch / Salon Manager — walk-in bookings |
| `/admin` | Brand Admin — dashboard, bookings, branches |
| `/platform` | Platform Admin — tenants, branches, employee onboarding |

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | platform@salonplatform.local | admin123 |
| Brand CEO | ceo@demo-brand.local | ceo123 |
| Lithos Manager | manager.lithos@demo-brand.local | manager123 |
| Webcity Manager | manager.webcity@demo-brand.local | manager123 |

## Related Repo

Backend: [salon-platform-backend](https://github.com/sumitsuri/salon-platform-backend)
