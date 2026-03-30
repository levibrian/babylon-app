# Features Index — Babylon App (Angular)

## Feature Map

| Feature | Status | File | Summary |
|---------|--------|------|---------|
| **Portfolio** | Production | [portfolio.md](portfolio.md) | Portfolio overview page. Positions list, allocation display, rebalancing status, insights carousel. |
| **Transactions** | Production | [transactions.md](transactions.md) | Transaction management. List, add form, inline edit row. All types: Buy, Sell, Dividend. |
| **Analytics** | Production | [analytics.md](analytics.md) | Performance line chart, realized P&L widget, portfolio insights. |
| **Recurring Investments** | Placeholder | _(not implemented)_ | `recurring-investments-list` component exists but feature is not built. |

---

## Cross-Feature Rules

- Smart components own data fetching — dumb components are purely presentational
- Services shared across features live in `services/`
- Shared UI components live in `components/common/`
- New features should follow the smart/dumb split pattern from day one
