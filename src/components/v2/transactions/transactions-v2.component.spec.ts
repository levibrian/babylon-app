import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TransactionsV2Component } from './transactions-v2.component';
import { TransactionService } from '../../../services/transaction.service';
import { PortfolioService } from '../../../services/portfolio.service';
import { Transaction } from '../../../models/transaction.model';
import { provideRouter } from '@angular/router';

const TX_BUY1: Transaction = {
  id: '1', date: '2026-04-22', ticker: 'AAPL', transactionType: 'buy',
  shares: 5, sharePrice: 192.34, fees: 0, totalAmount: 961.70, securityName: 'Apple',
};
const TX_BUY2: Transaction = {
  id: '2', date: '2026-03-10', ticker: 'MSFT', transactionType: 'buy',
  shares: 3, sharePrice: 410.50, fees: 0, totalAmount: 1231.50, securityName: 'Microsoft',
};
const TX_SELL: Transaction = {
  id: '3', date: '2026-03-28', ticker: 'AAPL', transactionType: 'sell',
  shares: 2, sharePrice: 218.60, fees: 0, totalAmount: 437.20, securityName: 'Apple',
  realizedPnL: 66.20, realizedPnLPct: 17.86,
};
const TX_DIV: Transaction = {
  id: '4', date: '2026-04-15', ticker: 'VWCE', transactionType: 'dividend',
  shares: 0, sharePrice: 0, fees: 0, totalAmount: 43.20, securityName: 'Vanguard ETF',
};

const ALL_TX = [TX_BUY1, TX_BUY2, TX_SELL, TX_DIV];

function makeServiceSpy() {
  return {
    transactions: signal<Transaction[]>(ALL_TX),
    loading: signal(false),
    error: signal<string | null>(null),
    cashBalance: signal(500),
    addTransaction: jasmine.createSpy('addTransaction').and.returnValue(Promise.resolve()),
    updateTransaction: jasmine.createSpy('updateTransaction').and.returnValue(Promise.resolve()),
    deleteTransaction: jasmine.createSpy('deleteTransaction').and.returnValue(Promise.resolve()),
    reload: jasmine.createSpy('reload').and.returnValue(Promise.resolve()),
  };
}

function makePortfolioSpy() {
  return {
    portfolio: signal([
      { ticker: 'AAPL', companyName: 'Apple', totalCost: 961.70, totalShares: 5, averageSharePrice: 192.34, currentMarketValue: null, unrealizedPnL: null, unrealizedPnLPercentage: null, transactions: [], securityType: 'Stock', targetAllocationPercentage: 0, currentAllocationPercentage: 0, allocationDifference: 0, rebalanceAmount: null, rebalancingStatus: 'Balanced' },
    ]),
    loading: signal(false),
    totalInvested: signal(0),
  };
}

describe('TransactionsV2Component', () => {
  let fixture: ComponentFixture<TransactionsV2Component>;
  let component: TransactionsV2Component;
  let txSpy: ReturnType<typeof makeServiceSpy>;
  let portfolioSpy: ReturnType<typeof makePortfolioSpy>;

  beforeEach(async () => {
    txSpy = makeServiceSpy();
    portfolioSpy = makePortfolioSpy();
    await TestBed.configureTestingModule({
      imports: [TransactionsV2Component],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TransactionService, useValue: txSpy },
        { provide: PortfolioService, useValue: portfolioSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionsV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // filteredTransactions
  it('should return all transactions when search is empty and type is all', () => {
    expect(component.filteredTransactions().length).toBe(4);
  });

  it('should filter by ticker search query', () => {
    component.searchQuery.set('aapl');
    expect(component.filteredTransactions().every(t => t.ticker === 'AAPL')).toBeTrue();
  });

  it('should filter by securityName search query', () => {
    component.searchQuery.set('micro');
    expect(component.filteredTransactions().every(t => t.securityName?.toLowerCase().includes('micro'))).toBeTrue();
  });

  it('should filter by type', () => {
    component.typeFilter.set('buy');
    expect(component.filteredTransactions().every(t => t.transactionType === 'buy')).toBeTrue();
  });

  it('should combine search and type filters', () => {
    component.searchQuery.set('aapl');
    component.typeFilter.set('sell');
    const result = component.filteredTransactions();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('3');
  });

  // Stats
  it('statsInvested should sum totalAmount for buy transactions', () => {
    // TX_BUY1 (961.70) + TX_BUY2 (1231.50) = 2193.20
    expect(component.statsInvested()).toBeCloseTo(2193.20, 1);
  });

  it('statsInvested should update when type filter is applied', () => {
    component.typeFilter.set('sell');
    expect(component.statsInvested()).toBe(0);
  });

  it('statsClosed should sum realizedPnL for sell transactions', () => {
    expect(component.statsClosed()).toBeCloseTo(66.20, 1);
  });

  it('statsClosed should return null when no sells in filtered set', () => {
    component.typeFilter.set('buy');
    expect(component.statsClosed()).toBeNull();
  });

  // Drawer
  it('should set drawerOpen to true when openDrawer is called', () => {
    component.openDrawer();
    expect(component.drawerOpen()).toBeTrue();
  });

  it('should set drawerTx to null when openDrawer called with no argument', () => {
    component.openDrawer();
    expect(component.drawerTx()).toBeNull();
  });

  it('should set drawerTx to transaction when openDrawer called with transaction', () => {
    component.openDrawer(TX_BUY1);
    expect(component.drawerTx()).toBe(TX_BUY1);
  });

  it('should set drawerOpen to false when closeDrawer is called', () => {
    component.openDrawer();
    component.closeDrawer();
    expect(component.drawerOpen()).toBeFalse();
  });

  // Service calls
  it('should call transactionService.addTransaction on saveTransaction with null drawerTx', async () => {
    component.openDrawer();
    const data = { ticker: 'AAPL', transactionType: 'buy' as const, shares: 1, sharePrice: 100, fees: 0, totalAmount: 100, date: '2026-05-01' };
    await component.saveTransaction(data);
    expect(txSpy.addTransaction).toHaveBeenCalledWith(data);
    expect(component.drawerOpen()).toBeFalse();
  });

  it('should call transactionService.updateTransaction on saveTransaction with existing drawerTx', async () => {
    component.openDrawer(TX_BUY1);
    const data = { ticker: 'AAPL', transactionType: 'buy' as const, shares: 1, sharePrice: 100, fees: 0, totalAmount: 100, date: '2026-05-01' };
    await component.saveTransaction(data);
    expect(txSpy.updateTransaction).toHaveBeenCalled();
    expect(component.drawerOpen()).toBeFalse();
  });

  it('should call transactionService.deleteTransaction on deleteTransaction', async () => {
    await component.deleteTransaction(TX_BUY1);
    expect(txSpy.deleteTransaction).toHaveBeenCalledWith(TX_BUY1.id, TX_BUY1.ticker);
  });

  // Page structure
  it('should render page title "Transactions"', () => {
    const title = fixture.nativeElement.querySelector('.page-title');
    expect(title!.textContent!.trim()).toBe('Transactions');
  });

  it('should render transaction count in subtitle', () => {
    const sub = fixture.nativeElement.querySelector('.page-subtitle');
    expect(sub!.textContent).toContain('4');
  });

  it('should render type filter buttons', () => {
    const btns = fixture.nativeElement.querySelectorAll('.tf-btn');
    const labels = Array.from(btns).map((b: any) => b.textContent!.trim());
    expect(labels).toContain('All');
    expect(labels).toContain('Buy');
    expect(labels).toContain('Sell');
    expect(labels).toContain('Div');
  });

  it('should show empty state when filteredTransactions is empty', () => {
    component.searchQuery.set('xrpthisdoesnotexist');
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('.empty-state.visible');
    expect(empty).toBeTruthy();
  });
});
