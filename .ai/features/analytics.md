# Analytics Feature

## Overview

Portfolio performance visualization and realized P&L tracking. Data is fetched from the API — the frontend only displays it.

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| Portfolio performance line chart | Display | Renders portfolio value over time from history snapshots |
| Realized P&L widget | Display | Shows realized profit/loss from closed positions |
| Portfolio insights carousel | Display | Cycles through `PortfolioInsight` items from the API |

---

## API Endpoints

| Data | Endpoint |
|------|----------|
| Portfolio history (chart data) | `GET /api/v1/history` |
| Realized P&L | Included in portfolio response or dedicated endpoint |
| Portfolio insights | `GET /api/v1/insights` |

---

## Key Data Models

```typescript
interface PortfolioInsight {
  message: string;
  severity: 'warning' | 'info' | 'positive';
}

// History snapshot (for line chart)
interface PortfolioSnapshot {
  timestamp: number;         // Unix timestamp
  totalMarketValue: number;
  totalInvested: number;
  unrealizedPnL: number;
  cashBalance: number;
}
```

---

## Notes

- All calculations (P&L, chart values, insight generation) are owned by the API
- Frontend only fetches and renders — no recalculation of financial metrics
- Chart library: determined by component implementation (check component file for specifics)
- Insights carousel cycles through `PortfolioInsight[]` from `GET /api/v1/insights`
