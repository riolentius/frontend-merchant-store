# frontend-merchant-store

Admin panel frontend for [golang-backend-platform](https://github.com/riolentius/golang-backend-platform) — a production-oriented backend built with Golang + PostgreSQL.

---

## Tech Stack

- **Nuxt 3** — Vue framework with `app/` directory convention
- **PrimeVue** — UI components with Aura theme
- **TypeScript** — throughout
- **Cookie-based JWT auth** — SSR-safe via `useCookie()`

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000`. Make sure the backend is running at `http://localhost:8080`.

## Mock Mode

The frontend includes a mock data layer for UI development without a running backend. Toggle it in:

```ts
// app/mocks/config.ts
export const USE_MOCK = true; // set to false to use real API
```

Mock credentials: `admin` / `admin123`

## Project Structure

```
app/
├── assets/css/       # Global stylesheets
├── components/       # Reusable UI components
├── composables/      # useAuth, useDashboard
├── layouts/          # dashboard, auth
├── middleware/       # auth.global.ts (route guard)
├── mocks/            # Mock data for UI development
├── pages/            # admin/, auth/
└── plugins/          # $api plugin with Bearer token injection
```

## Backend

This project is the frontend for:
**[riolentius/golang-backend-platform](https://github.com/riolentius/golang-backend-platform)**
