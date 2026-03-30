# Architecture — Babylon App (Angular)

## Overview

Angular-based portfolio management frontend for the Babylon platform. Communicates exclusively with `Babylon.Alfred.Api` for all data and business logic. The frontend is a **display layer** — it presents what the API computes, never recalculates.

**API base URL**: `https://localhost:7192` (dev) / `https://babylonfinance.vercel.app` (prod)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 20 (standalone components, no NgModules) |
| Language | TypeScript 5.8.2 |
| State | Angular Signals (`signal()`, `computed()`, `effect()`) |
| Reactive | RxJS (minimal — mainly router integration) |
| Styling | Tailwind CSS (CDN) |
| Notifications | ngx-sonner (toast notifications) |
| Build | Angular CLI + Vite bundler |
| Deployment | Docker + Nginx (Alpine), Docker Compose |

---

## Application Architecture

```
src/
├── app-routes.ts                    # Route configuration
├── app.component.ts                 # Root component (includes toaster)
├── components/                      # Feature and shared components
│   ├── common/error-state/         # Shared error state component
│   ├── portfolio-page/             # Smart: Portfolio page container
│   ├── portfolio-list/             # Dumb: Portfolio positions list
│   ├── transactions-page/          # Smart: Transactions page container
│   ├── transaction-list/           # Dumb: Transactions list
│   ├── transaction-form/           # Form: Add transaction
│   ├── transaction-edit-row/       # Form: Edit transaction inline
│   ├── recurring-investments-list/ # Placeholder (not yet implemented)
│   └── ghosting-elements/          # Loading skeleton components
├── models/                         # TypeScript interfaces and types
│   ├── transaction.model.ts
│   ├── portfolio.model.ts
│   └── api-response.model.ts
├── services/                       # Injectable services (HTTP + state)
│   ├── transaction.service.ts
│   └── portfolio.service.ts
├── interceptors/                   # HTTP interceptors (JWT, 401 refresh)
├── guards/                         # Route guards
├── directives/                     # Custom directives
├── utils/                          # Pure utility functions
│   └── transaction-mapper.util.ts
└── environments/                   # Environment configuration
```

---

## Design Patterns

### Smart / Dumb Component Split

| Type | Responsibility | Examples |
|------|---------------|---------|
| **Smart (Container)** | Data fetching, service injection, state management | `portfolio-page`, `transactions-page` |
| **Dumb (Presentational)** | Pure display, receives data via `@Input()`, emits via `@Output()` | `portfolio-list`, `transaction-list` |

**Dumb components contain zero service calls or business logic.**

### Service Pattern
- Services handle all HTTP calls and state management
- Components receive data from services via signals or `@Input()`
- Services expose signals for reactive state

### Signal-Based Reactivity
- `signal()` for reactive state
- `computed()` for derived state
- `effect()` for side effects
- OnPush change detection strategy on all components

---

## API Response Envelope

All API responses follow `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors: string[];
}
```

**Always handle both success and error paths explicitly.**

---

## HTTP Layer

- **JWT attachment**: HTTP interceptor handles automatic JWT injection on all requests
- **401 handling**: Interceptor handles token refresh retry automatically
- **No manual auth logic in components or services** — interceptor owns this

---

## TypeScript Conventions

- **No `any`** — typed interfaces for every API request and response
- Interfaces for all models in `models/`
- Mapper utilities for API → domain model transformations

---

## Data Flow

```
API (source of truth)
  ↓ HTTP (via service + interceptor)
Service (state management via signals)
  ↓ signals / @Input()
Smart Component (data fetching)
  ↓ @Input()
Dumb Component (display only)
```

**Business logic never lives in components. The API is the source of truth for all calculations.**

---

## Routing

All routes configured in `app-routes.ts`. Angular router with standalone components.

---

## Error Handling

- `common/error-state/` component: centered error state with retry functionality
- ngx-sonner: toast notifications for success/error user feedback
- Services catch HTTP errors and expose error state via signals

---

## Deployment

- **Docker**: Multi-stage build (Node.js build → Nginx serve)
- **Nginx**: Alpine Linux, serves static files
- **Docker Compose**: Local orchestration
- **Production**: `babylonfinance.vercel.app`
