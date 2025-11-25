<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Babylon Portfolio Management Application

Angular-based portfolio management application for tracking investments and transactions.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Project Overview & Domain Objective](#project-overview--domain-objective)
3. [Technology Stack](#technology-stack)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Data Models & API Contracts](#data-models--api-contracts)
6. [Component Structure](#component-structure)
7. [Services & State Management](#services--state-management)
8. [UI/UX Patterns & Styling](#uiux-patterns--styling)
9. [User Feedback & Error Handling](#user-feedback--error-handling)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Development Workflow](#development-workflow)
12. [Architectural Risks & Recommendations](#architectural-risks--recommendations)

---

## Quick Start

### Prerequisites
- Node.js (v20 or higher recommended)
- Backend API running at `https://localhost:7192`

### Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up --build

# Access app at http://localhost:3001
```

---

## Project Overview & Domain Objective

**Babylon** is a modern portfolio management web application designed to help users track their investment portfolio, manage transactions, and monitor portfolio allocation against target allocations. The application provides real-time insights into portfolio performance, rebalancing recommendations, and transaction history.

### Core Features
- **Portfolio Overview**: View all positions with current vs. target allocation percentages
- **Transaction Management**: Add, edit, and delete buy/sell/dividend transactions
- **Rebalancing Insights**: Automatic calculation and display of rebalancing recommendations (Overweight/Underweight/Balanced)
- **Recurring Investments**: Framework for managing recurring investment schedules (placeholder, not yet implemented)
- **Portfolio Insights**: Carousel display of portfolio insights and recommendations from backend
- **Toast Notifications**: Success/error feedback for user actions
- **Error State Management**: Professional error handling with retry functionality

### Business Logic
- Portfolio positions are aggregated from individual transactions
- Each position has a target allocation percentage that users aim to maintain
- The system calculates current allocation based on total invested amount
- Rebalancing status is determined by comparing current vs. target allocation (±0.1% threshold)
- Backend provides allocation calculations; UI generates rebalancing messages dynamically

---

## Technology Stack

### Frontend Framework
- **Angular 20.3.0** (latest version)
  - Standalone components (no NgModules)
  - Signals-based reactive state management
  - OnPush change detection strategy for performance
  - TypeScript 5.8.2

### Styling & UI
- **Tailwind CSS** (via CDN)
  - Utility-first CSS framework
  - Responsive design with mobile-first approach
  - Custom color scheme: gray scale with green/red for financial indicators

### State Management
- **Angular Signals** (primary)
  - `signal()` for reactive state
  - `computed()` for derived state
  - `effect()` for side effects
- **RxJS** (minimal usage, mainly for router integration)

### User Feedback
- **ngx-sonner**: Toast notifications for success/error feedback
- **Custom Error State Component**: Centered error states with retry functionality

### Build & Development
- **Angular CLI** with Vite bundler
- **Node.js 20+** (Alpine Linux in Docker)
- **npm** for package management

### Deployment
- **Docker** (multi-stage builds)
- **Nginx** (Alpine Linux) for serving static files
- **Docker Compose** for orchestration

---

## Architecture & Design Patterns

### Application Architecture
- **Component-Based Architecture**: Standalone Angular components
- **Service Layer Pattern**: Business logic separated into injectable services
- **Signal-Based Reactivity**: Modern Angular signals for state management
- **Separation of Concerns**: Models, services, components, and utilities are clearly separated

### Design Patterns Used
1. **Service Pattern**: `TransactionService` and `PortfolioService` handle data fetching and business logic
2. **Signal Pattern**: Reactive state management using Angular signals
3. **Component Communication**: 
   - Parent-child: `@Input()` and `@Output()` decorators
   - Service injection: Shared state via injectable services
4. **Mapper Pattern**: Utility functions to transform API responses to domain models
5. **Container/Presentational Pattern**: Page components (containers) vs. list components (presentational)

### File Structure
```
src/
├── app-routes.ts                    # Route configuration
├── app.component.ts                 # Root component
├── app.component.html              # Root template (includes toaster)
├── components/                      # Feature components
│   ├── common/                     # Shared/reusable components
│   │   └── error-state/            # Error state component
│   ├── portfolio-page/             # Portfolio page container
│   ├── portfolio-list/             # Portfolio positions list
│   ├── transactions-page/          # Transactions page container
│   ├── transaction-list/           # Transactions list
│   ├── transaction-form/           # Add transaction form
│   ├── transaction-edit-row/       # Edit transaction inline form
│   ├── recurring-investments-list/ # Recurring investments (placeholder)
│   └── ghosting-elements/          # Loading skeleton components
├── models/                         # TypeScript interfaces/types
│   ├── transaction.model.ts
│   ├── portfolio.model.ts
│   └── api-response.model.ts
├── services/                       # Injectable services
│   ├── transaction.service.ts
│   └── portfolio.service.ts
└── utils/                          # Utility functions
    └── transaction-mapper.util.ts
```

---

## Data Models & API Contracts

### Domain Models

#### Transaction Model (`transaction.model.ts`)
```typescript
interface Transaction {
  id: string;
  date: string;                    // ISO format
  ticker: string;                  // e.g., 'AAPL'
  transactionType: 'buy' | 'sell' | 'dividend';
  shares: number;
  sharePrice: number;
  fees: number;
  totalAmount: number;             // Calculated: shares * sharePrice
  securityName?: string;            // Optional company name
}

type NewTransactionData = Omit<Transaction, 'id' | 'totalAmount'>;
```

#### Portfolio Model (`portfolio.model.ts`)
```typescript
interface PortfolioItem {
  ticker: string;
  companyName: string;
  totalShares: number;              // Aggregated from transactions
  totalCost: number;                // Total invested amount
  averageSharePrice: number;        // Calculated: totalCost / totalShares
  transactions: Transaction[];      // All transactions for this position
  
  // Strategic Allocation fields (from backend - Source of Truth)
  targetAllocationPercentage: number;    // e.g., 30 for 30%
  currentAllocationPercentage: number;   // e.g., 31.5 for 31.5%
  allocationDifference: number;          // Current - Target
  rebalanceAmount: number;               // Amount to buy/sell for rebalancing
  rebalancingStatus: string;             // "Balanced", "Overweight", or "Underweight"
  
  // Pending sync state (for optimistic updates)
  pendingSync?: boolean; // true when local changes are pending backend sync
}

interface PortfolioInsight {
  message: string;
  severity: 'warning' | 'info' | 'positive';
}
```

### API Response Models (`api-response.model.ts`)

#### Backend Transaction DTO
```typescript
interface ApiTransaction {
  id: string;
  transactionType: string;          // "Buy", "Sell" (capitalized)
  date: number;                     // Unix timestamp
  sharesQuantity: number;
  sharePrice: number;
  fees: number;
  totalAmount: number;
  securityName?: string;
  ticker?: string;                  // Optional, may be in position context
}
```

#### Backend Position DTO
```typescript
interface ApiPortfolioPosition {
  ticker: string;
  securityName: string;
  totalInvested: number;
  totalShares: number;
  averageSharePrice: number;
  currentAllocationPercentage: number | null;
  targetAllocationPercentage: number;   // Already a percentage (e.g., 4.48)
  allocationDeviation: number;           // Current - Target
  rebalancingAmount: number;
  rebalancingStatus: string;             // "Balanced", "Overweight", "Underweight"
  currentMarketValue: number | null;
  transactions: ApiTransaction[];
}
```

#### Backend Portfolio Response
```typescript
interface ApiPortfolioResponse {
  positions: ApiPortfolioPosition[];
  totalInvested: number;
  dailyGainLoss?: number;
  dailyGainLossPercentage?: number;
  insights?: ApiPortfolioInsight[];
}
```

### API Endpoints

**Base URL**: `https://localhost:7192`

1. **GET `/api/v1/portfolios/{userId}`**
   - Returns: `ApiPortfolioResponse`
   - Fetches all portfolio positions with transactions and insights

2. **GET `/api/v1/transactions/{userId}`**
   - Returns: `ApiTransaction[]`
   - Fetches all transactions for a user

3. **POST `/api/v1/transactions/{userId}`**
   - Body: `NewTransactionData`
   - Creates a new transaction

4. **PUT `/api/v1/transactions/{userId}/{transactionId}`**
   - Body: `Transaction`
   - Updates an existing transaction

5. **DELETE `/api/v1/transactions/{userId}/{transactionId}`**
   - Deletes a transaction

**Current User ID**: `a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d` (hardcoded for development)

### Data Transformation

The application uses mapper utilities to transform API responses:
- `mapApiTransactionToTransaction()`: Converts API transaction to domain model
  - Converts Unix timestamp to ISO string
  - Converts transaction type to lowercase
  - Handles optional ticker fallback
- `mapApiTransactionsToTransactions()`: Batch transformation
- `mapApiDataToPortfolio()`: Transforms portfolio API response to domain models

---

## Component Structure

### Page Components (Containers)

#### PortfolioPageComponent
- **Location**: `src/components/portfolio-page/`
- **Responsibility**: Container for portfolio overview
- **Features**:
  - Displays total portfolio value with daily gain/loss
  - Shows portfolio insights carousel (auto-rotating, 5-second intervals)
  - Manages portfolio data loading states
  - Handles transaction updates/deletes from portfolio context
  - Uses `ErrorStateComponent` for error handling
- **Layout**: 55% left pane (navigation + summary), 45% right pane (positions list)
- **Signals Used**: `portfolio`, `totalValue`, `dailyGainLoss`, `insights` from `PortfolioService`

#### TransactionsPageComponent
- **Location**: `src/components/transactions-page/`
- **Responsibility**: Container for transactions management
- **Features**:
  - Toggle add transaction form (via query param `?add=true`)
  - Switch between "Historical Transactions" and "Recurring Investments" views
  - Displays total amount invested
  - Manages transaction CRUD operations
  - Uses `ErrorStateComponent` for error handling
- **Layout**: 55% left pane (navigation + summary), 45% right pane (transactions/recurring list)
- **State Management**: 
  - `isAddingTransaction` signal
  - `activeView` signal ('transactions' | 'recurring')
  - Query param synchronization

### List Components (Presentational)

#### PortfolioListComponent
- **Location**: `src/components/portfolio-list/`
- **Responsibility**: Display portfolio positions with expandable transaction details
- **Features**:
  - Expandable/collapsible position items
  - Inline transaction editing
  - Rebalancing status badges with color coding
  - Badge-based UI (Option 4 design)
  - Pending sync indicator for positions awaiting backend sync
- **Inputs**: `portfolio: PortfolioItem[]`
- **Outputs**: `update`, `delete`
- **Internal State**: `expandedTickers`, `editingTransactionId`

#### TransactionListComponent
- **Location**: `src/components/transaction-list/`
- **Responsibility**: Display historical transactions list
- **Features**:
  - Transaction type badges (buy/sell/dividend)
  - Inline editing
  - Add transaction button integration
  - Navigation to recurring investments
- **Inputs**: `transactions`, `isAdding`, `isLoading`, `error`
- **Outputs**: `save`, `cancel`, `update`, `delete`, `toggleAdd`, `navigateToRecurring`

#### RecurringInvestmentsListComponent
- **Location**: `src/components/recurring-investments-list/`
- **Status**: Placeholder (not yet implemented)
- **Features**: Navigation back to transactions
- **Outputs**: `navigateToTransactions`

### Common Components

#### ErrorStateComponent
- **Location**: `src/components/common/error-state/`
- **Responsibility**: Display centered error states with retry functionality
- **Features**:
  - Professional, non-alarming design
  - Customizable title and message
  - Retry button with event emission
  - Neutral gray color scheme
- **Inputs**: 
  - `title` (default: "Unable to load data")
  - `message` (default: "We couldn't connect to Alfred. Please check your connection.")
- **Outputs**: `retry` (EventEmitter)

### Form Components

#### TransactionFormComponent
- **Location**: `src/components/transaction-form/`
- **Responsibility**: Form for adding new transactions
- **Features**: Two-line layout (Buy/Sell buttons + Accept/Cancel on first line, inputs on second line)

#### TransactionEditRowComponent
- **Location**: `src/components/transaction-edit-row/`
- **Responsibility**: Inline editing form for existing transactions
- **Features**: Same two-line layout as add form

### Skeleton Components (Loading States)
- `PortfolioSkeletonComponent`
- `TransactionSkeletonComponent`

---

## Services & State Management

### TransactionService
- **Location**: `src/services/transaction.service.ts`
- **Responsibility**: Manage transaction data and CRUD operations
- **State Signals**:
  - `transactions: Signal<Transaction[]>` (readonly)
  - `loading: Signal<boolean>`
  - `error: Signal<string | null>`
- **Methods**:
  - `reload()`: Refetch transactions from API
  - `addTransaction()`: POST new transaction, then reload transactions and portfolio, shows success toast
  - `updateTransaction()`: PUT transaction, then reload both, shows success toast
  - `deleteTransaction()`: DELETE transaction, then reload both, shows success toast
- **Dependencies**: Injects `PortfolioService` to trigger portfolio reloads
- **User Feedback**: Uses `ngx-sonner` toast notifications for success/error feedback

### PortfolioService
- **Location**: `src/services/portfolio.service.ts`
- **Responsibility**: Manage portfolio data, calculations, and insights
- **State Signals**:
  - `portfolio: Signal<PortfolioItem[]>` (readonly)
  - `totalInvested: Signal<number>`
  - `totalPortfolioValue: Signal<number>` (computed: totalInvested + dailyGainLoss)
  - `dailyGainLoss: Signal<number>`
  - `dailyGainLossPercentage: Signal<number>`
  - `insights: Signal<PortfolioInsight[]>`
  - `loading: Signal<boolean>`
  - `error: Signal<string | null>`
- **Methods**:
  - `reload()`: Refetch portfolio from API
  - `addTransaction()`: Local calculation for optimistic updates (before backend sync) - only simple aggregations
  - `updateTransaction()`: Local recalculation - only simple aggregations
  - `deleteTransaction()`: Local recalculation - only simple aggregations
- **Internal Methods**:
  - `_recalculatePositionAggregates()`: Calculate totalShares, totalCost, averageSharePrice from transactions
  - `_recalculateAllocations()`: ⚠️ Deprecated - Allocation calculations deferred to backend
  - `mapApiDataToPortfolio()`: Transform API response to domain models

### State Management Strategy
- **Primary**: Angular Signals for reactive state
- **Service Injection**: Services are `providedIn: 'root'` (singleton)
- **Change Detection**: `OnPush` strategy on all components for performance
- **Data Flow**: 
  1. User action → Component method
  2. Component calls Service method
  3. Service updates signal state
  4. Components reactively update via signal reads in templates

---

## Routing & Navigation

### Route Configuration (`app-routes.ts`)
```typescript
Routes = [
  { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
  { path: 'transactions', component: TransactionsPageComponent },
  { path: 'portfolio', component: PortfolioPageComponent },
  { path: 'portfolio-design-demo', component: PortfolioDesignDemoComponent }, // Demo route
]
```

### Navigation Pattern
- **Left Pane Navigation**: Horizontal links between "Portfolio" and "Transactions"
- **Right Pane Navigation** (Transactions page only): Toggle between "Historical Transactions" and "Recurring Investments"
- **Query Parameters**: `?add=true` to show add transaction form (persists on page reload)

### Router Integration
- Uses `RouterLink` directive for navigation
- `ActivatedRoute` and `Router` for query param management
- `toSignal()` from `@angular/core/rxjs-interop` to convert query params to signals

---

## UI/UX Patterns & Styling

### Layout Structure
- **Responsive Split Layout**: 
  - Desktop (lg breakpoint): 55% left / 45% right split
  - Mobile: Stacked vertically
- **Left Pane**: 
  - Top 20%: Navigation + Summary (Total Portfolio Value / Total Amount Invested)
  - Bottom 80%: Placeholder for future dashboards/metrics
- **Right Pane**: 
  - Scrollable content area (positions or transactions)
  - Fixed height: `100vh` with `overflow-y: auto`

### Design System
- **Color Palette**:
  - Primary: Gray scale (`gray-50`, `gray-100`, `gray-400`, `gray-600`, `gray-900`)
  - Success: Green (`green-100`, `green-600`, `green-800`) for buy/underweight
  - Danger: Red (`red-100`, `red-600`, `red-800`) for sell/overweight
  - Info: Blue (`blue-100`, `blue-800`) for dividends
- **Typography**:
  - Headings: `font-bold`, `text-2xl` to `text-3xl`
  - Body: `text-sm` to `text-base`
  - Labels: `text-xs`, `font-medium`
- **Spacing**: Tailwind spacing scale (`p-4`, `p-6`, `gap-2`, `mb-4`, etc.)

### Component Patterns

#### Portfolio Position Display (Option 4 - Minimalist with Badges)
- **Layout**: Single card with badges row
- **Left Section**: Company name (bold, `text-sm`), badges for shares/price, allocation, rebalancing
- **Right Section**: Total cost (bold, `text-sm`), pending sync indicator (if applicable), chevron icon
- **Badges**: 
  - Position badge: Shares @ Average Price
  - Allocation badge: Current % → Target %
  - Rebalancing badge: Buy/Sell amount (only if not Balanced)
- **Expandable**: Click to expand/collapse transaction list
- **Transaction Items**: Indented (`pl-10`), compact display with icon, type, date, shares @ price, total amount

#### Transaction List Display
- **Layout**: Condensed single-line items
- **Header**: "Historical Transactions" label + Add button
- **Items**: Transaction type badge, company name, date, shares @ price, total amount
- **Editing**: Inline edit row replaces item when editing

#### Scrolling Behavior
- **Scrollbar Gutter**: `scrollbar-gutter: stable` to prevent content shift when scrollbar appears
- **Overflow Control**: `overflow-y: auto` on scrollable containers, `overflow-hidden` on parent containers
- **Height Constraints**: `height: 100vh` on root, `height: 100%` on scrollable panes

### Responsive Breakpoints
- **Mobile**: Default (< 1024px)
- **Desktop**: `lg:` prefix (≥ 1024px)
- **Tailwind Breakpoints**: `sm:` (640px), `lg:` (1024px)

### Accessibility
- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management

---

## User Feedback & Error Handling

### Toast Notifications (ngx-sonner)

**Implementation**: Global toaster component added to `app.component.html` positioned at `bottom-right`.

**Usage in TransactionService**:
- **Success Toasts**: 
  - "Transaction saved successfully" (on add)
  - "Position updated" (on update)
  - "Transaction deleted successfully" (on delete)
- **Error Toasts**: Replaces `alert()` calls with error toast notifications

**Configuration**:
- Position: `bottom-right`
- Auto-dismiss: Default behavior
- Styling: Integrated with Tailwind CSS

### Error State Component

**Purpose**: Replace scary red error banners with professional, centered error states.

**Design**:
- **Layout**: Flex column, centered vertically and horizontally
- **Icon**: Neutral cloud-off icon (`text-gray-300`, size 16)
- **Title**: `text-lg font-semibold text-gray-900` (default: "Unable to load data")
- **Message**: `text-sm text-gray-500 max-w-xs text-center` (default: "We couldn't connect to Alfred...")
- **Button**: Secondary button style (`border border-gray-300 text-gray-700 hover:bg-gray-50`)
- **Vibe**: Professional, calm, financial - NOT "System Critical Error" red

**Integration**:
- Used in `PortfolioPageComponent` right pane when `error()` is present and `portfolio().length === 0`
- Used in `TransactionsPageComponent` right pane when `error()` is present and `transactions().length === 0`
- Retry button triggers service `reload()` method
- Skeleton loaders still show while `loading()` is true

**Benefits**:
- Better UX: Non-alarming error presentation
- Consistent: Reusable component across the app
- Actionable: Clear retry functionality
- Professional: Maintains financial app aesthetic

---

## Deployment & Infrastructure

### Docker Configuration

#### Dockerfile (Multi-stage)
```dockerfile
# Stage 1: Build Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
services:
  babylon-app:
    build: .
    ports:
      - "3001:80"  # Host port 3001 → Container port 80
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
```

#### Nginx Configuration
- **Gzip compression**: Enabled for text assets
- **Security headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Angular routing**: `try_files` fallback to `index.html` for SPA routing
- **Static asset caching**: 1 year cache for images, CSS, JS, fonts
- **Health check endpoint**: `/health` returns 200

### Environment Configuration
- **Development**: `npm run dev` (Angular dev server on port 3000)
- **Production**: Docker build → Nginx on port 3001
- **Backend API**: `https://localhost:7192` (hardcoded, should be environment variable)

### Build Process
1. Install dependencies: `npm ci`
2. Build Angular app: `npm run build` (outputs to `dist/`)
3. Copy build artifacts to Nginx HTML directory
4. Serve static files via Nginx

---

## Development Workflow

### Prerequisites
- Node.js 20+ (managed via nvm)
- npm
- Docker & Docker Compose (for containerized deployment)
- Backend API running at `https://localhost:7192`

### Local Development
```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Development
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access app at http://localhost:3001
```

### Code Style & Patterns
- **TypeScript**: Strict typing, interfaces for all models
- **Angular**: Standalone components, signals, OnPush change detection
- **Naming Conventions**:
  - Components: PascalCase (`PortfolioListComponent`)
  - Files: kebab-case (`portfolio-list.component.ts`)
  - Services: PascalCase with "Service" suffix
  - Signals: camelCase with descriptive names (`isAddingTransaction`)
- **Imports**: Explicit imports, no barrel exports
- **Error Handling**: Try-catch blocks with user-friendly error messages and toast notifications

### Key Development Principles
1. **Reactive State**: Use signals for all reactive state
2. **Performance**: OnPush change detection, computed signals for derived state
3. **Separation of Concerns**: Business logic in services, presentation in components
4. **Type Safety**: Strong typing throughout, no `any` types
5. **User Experience**: Loading states, error handling, optimistic updates, toast notifications
6. **Error Handling**: Professional error states, not alarming red banners

---

## Architectural Risks & Recommendations

### The Logic Duplication Trap

#### Problem Statement
**Frontend**: `PortfolioService._recalculateAllocations()` performs optimistic allocation calculations for local transaction updates.

**Backend**: `PortfolioCalculator.DetermineRebalancingStatus()` performs authoritative allocation calculations.

**Risk**: Financial math is notorious for floating-point errors and "off-by-one" rounding differences between JavaScript (Frontend) and C# (Backend).

**Impact**: If the Frontend calculates a 4.99% deviation (Balanced) and the Backend calculates 5.01% (Overweight), the UI will flash from "Balanced" to "Overweight" the moment the API response comes back. This destroys user trust and creates a poor user experience.

#### Current Implementation
The `PortfolioService` currently:
1. Performs optimistic updates using `_recalculateAllocations()` when transactions are added/updated/deleted locally
2. Recalculates `currentAllocationPercentage`, `allocationDifference`, `rebalanceAmount`, and `rebalancingStatus` using JavaScript floating-point arithmetic
3. Uses a ±0.1% threshold to determine rebalancing status
4. Eventually syncs with backend, which may produce different results due to:
   - Different floating-point precision (JavaScript uses IEEE 754 double-precision, C# uses decimal for financial calculations)
   - Different rounding strategies
   - Different calculation order

#### Recommendations

**Short Term (Current Implementation)**:
- ✅ **Accept the flicker**: Acknowledge that optimistic updates may differ from backend calculations
- ✅ **Use a "Pending" state**: Show a visual indicator (e.g., loading spinner or "Syncing..." badge) on positions that have pending backend sync
- ✅ **Limit optimistic calculations**: Only recalculate simple aggregations (totalShares, totalCost, averageSharePrice) locally; defer allocation calculations to backend
- ✅ **Add visual feedback**: When backend response differs from optimistic update, show a subtle transition animation

**Long Term (Recommended Refactor)**:
- 🎯 **Move all calculation logic to Backend**: Treat the Frontend as a "View" and the Backend as the "Source of Truth"
- 🎯 **Remove `_recalculateAllocations()`**: Only perform simple aggregations (`_recalculatePositionAggregates`) for optimistic UI updates
- 🎯 **Use Backend Webhooks/Polling**: After transaction CRUD operations, immediately trigger a portfolio reload to get authoritative calculations
- 🎯 **Consider Shared Library**: If using WASM/Blazor in the future, share calculation logic between frontend and backend
- 🎯 **Simple calculations are OK**: Quantity × Price calculations are acceptable on frontend; complex allocation deviation logic should be backend-only

#### Implementation Strategy
1. **Phase 1**: ✅ Add `pendingSync` flag to `PortfolioItem` model
2. **Phase 2**: ✅ Mark positions as pending when local updates occur
3. **Phase 3**: ✅ Remove `_recalculateAllocations()` calls, only keep `_recalculatePositionAggregates()`
4. **Phase 4**: ✅ Ensure `TransactionService` always triggers `PortfolioService.reload()` after CRUD operations
5. **Phase 5**: ✅ Add UI indicators for pending sync states

#### Code Locations
- **Frontend Calculation**: `src/services/portfolio.service.ts` → `_recalculateAllocations()` (deprecated, kept for reference)
- **Backend Calculation**: Backend `PortfolioCalculator.DetermineRebalancingStatus()` (C#)
- **Optimistic Updates**: `addTransaction()`, `updateTransaction()`, `deleteTransaction()` methods (now only perform simple aggregations)

---

## Future Features & Considerations

### Planned Features
1. **Recurring Investments**: Full implementation of recurring investment scheduling
2. **Security Logos**: Integration of company logos (discussed, not implemented)
3. **Dashboard & Metrics**: Left pane bottom section placeholder for future analytics
4. **User Authentication**: Currently hardcoded user ID

### Technical Debt & Improvements
1. **Environment Variables**: Move API URL and user ID to environment config
2. **Error Handling**: More robust error handling with retry logic (partially implemented)
3. **Testing**: Unit tests and integration tests not yet implemented
4. **Accessibility**: Enhanced ARIA labels and keyboard navigation
5. **Performance**: Lazy loading for routes, virtual scrolling for long lists
6. **State Management**: Consider NgRx if complexity grows

---

## Summary for AI Assistants

This is a **modern Angular 20 portfolio management application** built with:
- **Signals-based reactivity** (no RxJS observables in components)
- **Standalone components** (no NgModules)
- **Tailwind CSS** for styling
- **Service layer** for business logic
- **55/45 split layout** (responsive)
- **Backend API integration** for portfolio and transaction data
- **Docker deployment** with Nginx
- **Toast notifications** (ngx-sonner) for user feedback
- **Professional error states** with retry functionality

The application focuses on **portfolio tracking**, **transaction management**, and **rebalancing insights**. The codebase follows Angular best practices with strong typing, separation of concerns, and performance optimizations.

**⚠️ Important Architectural Note**: There is currently logic duplication between frontend and backend for allocation calculations. See [Architectural Risks & Recommendations](#architectural-risks--recommendations) section for details and refactoring guidance.

When designing new features:
- Follow the existing component structure and naming conventions
- Use signals for state management
- Maintain the responsive layout pattern
- Keep business logic in services
- Use Tailwind utility classes for styling
- Consider the 55/45 split layout for new pages
- Ensure OnPush change detection for performance
- **Avoid duplicating complex financial calculations** - prefer backend as source of truth
- Use toast notifications for success/error feedback
- Use `ErrorStateComponent` for blocking data failures

---

## Backend API

The app expects the backend API to be running at `https://localhost:7192` with the following endpoints:
- `GET /api/v1/portfolios/{userId}` - Fetch portfolio data with positions and transactions
- `GET /api/v1/transactions/{userId}` - Fetch all transactions
- `POST /api/v1/transactions/{userId}` - Create a new transaction
- `PUT /api/v1/transactions/{userId}/{transactionId}` - Update a transaction
- `DELETE /api/v1/transactions/{userId}/{transactionId}` - Delete a transaction

Make sure your backend server is running and accessible before starting the frontend.
