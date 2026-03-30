# Portfolio Feature

## Overview

Portfolio overview page displaying all user positions with allocation tracking, rebalancing recommendations, and portfolio insights carousel.

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `portfolio-page` | Smart | Container. Fetches portfolio data from `PortfolioService`. Orchestrates child components. |
| `portfolio-list` | Dumb | Displays list of portfolio positions. Receives data via `@Input()`. |

---

## Service: PortfolioService

- **GET** `/api/v1/portfolios/{userId}` → `ApiPortfolioResponse`
- Exposes portfolio data via signals
- Handles loading and error states

---

## Key Data Models

```typescript
interface ApiPortfolioPosition {
  ticker: string;
  securityName: string;
  totalInvested: number;
  totalShares: number;
  averageSharePrice: number;
  currentAllocationPercentage: number | null;
  targetAllocationPercentage: number;     // Already a percentage (e.g., 4.48)
  allocationDeviation: number;             // Current - Target
  rebalancingAmount: number;
  rebalancingStatus: string;              // "Balanced", "Overweight", "Underweight"
  currentMarketValue: number | null;
  transactions: ApiTransaction[];
}

interface ApiPortfolioResponse {
  positions: ApiPortfolioPosition[];
  totalInvested: number;
  dailyGainLoss?: number;
  dailyGainLossPercentage?: number;
}
```

---

## Rebalancing Display

- **Rebalancing status** is calculated by the API — frontend only displays it
- Status values: `"Balanced"`, `"Overweight"`, `"Underweight"`
- UI generates rebalancing messages dynamically from status string
- Threshold (±0.5%) is enforced in the API, not the frontend

---

## Layout

- 55% left pane / 45% right pane responsive layout
- Positions ordered by target allocation percentage (API-determined)

---

## Error Handling

- `common/error-state/` component shown on fetch failure
- Retry button re-triggers service fetch
- Loading skeletons (`ghosting-elements/`) during initial fetch
