# Transactions Feature

## Overview

Transaction management page. Users can view, create, edit, and delete Buy/Sell/Dividend transactions.

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `transactions-page` | Smart | Container. Fetches transactions from `TransactionService`. |
| `transaction-list` | Dumb | Displays list of transactions. Receives data via `@Input()`. |
| `transaction-form` | Form | Add new transaction form. |
| `transaction-edit-row` | Form | Inline edit for an existing transaction. |

---

## Service: TransactionService

| Method | HTTP | Endpoint |
|--------|------|----------|
| Get all | GET | `/api/v1/transactions/{userId}` |
| Create | POST | `/api/v1/transactions/{userId}` |
| Update | PUT | `/api/v1/transactions/{userId}/{transactionId}` |
| Delete | DELETE | `/api/v1/transactions/{userId}/{transactionId}` |
| Bulk create | POST | `/api/v1/transactions/{userId}/bulk` |

---

## Key Data Models

```typescript
interface ApiTransaction {
  id: string;
  transactionType: string;   // "Buy", "Sell", "Dividend" (capitalized, from API)
  date: number;              // Unix timestamp (convert to display format)
  sharesQuantity: number;
  sharePrice: number;
  fees: number;
  totalAmount: number;       // Calculated by API
  securityName?: string;
  ticker?: string;
}

type NewTransactionData = Omit<ApiTransaction, 'id' | 'totalAmount'>;
```

---

## Data Transformation

`transaction-mapper.util.ts` transforms API response → domain model:
- Converts Unix timestamp to ISO string / display format
- Maps capitalized API type strings to UI-friendly format

---

## Notes

- `totalAmount` is calculated by the API — never recalculate on the frontend
- Transaction types are uppercase from the API (`"Buy"`, `"Sell"`, `"Dividend"`)
- Bulk insert supported for CSV/batch import scenarios
