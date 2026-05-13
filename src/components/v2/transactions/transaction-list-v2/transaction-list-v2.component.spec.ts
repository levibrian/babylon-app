import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TransactionListV2Component } from './transaction-list-v2.component';
import { MonthGroup } from '../transaction-group.util';
import { Transaction } from '../../../../models/transaction.model';

const BUY_TX: Transaction = {
  id: '1', date: '2026-04-22', ticker: 'AAPL', transactionType: 'buy',
  shares: 5, sharePrice: 192.34, fees: 0, totalAmount: 961.70, securityName: 'Apple',
};
const SELL_TX: Transaction = {
  id: '2', date: '2026-03-28', ticker: 'AAPL', transactionType: 'sell',
  shares: 2, sharePrice: 218.60, fees: 0, totalAmount: 437.20, securityName: 'Apple',
  realizedPnL: 66.20, realizedPnLPct: 17.86,
};
const DIV_TX: Transaction = {
  id: '3', date: '2026-04-15', ticker: 'VWCE', transactionType: 'dividend',
  shares: 0, sharePrice: 0, fees: 0, totalAmount: 43.20, securityName: 'Vanguard ETF',
};

const GROUPS: MonthGroup[] = [
  { label: 'April 2026', transactions: [BUY_TX, DIV_TX] },
  { label: 'March 2026', transactions: [SELL_TX] },
];

describe('TransactionListV2Component', () => {
  let fixture: ComponentFixture<TransactionListV2Component>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionListV2Component],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionListV2Component);
    fixture.componentRef.setInput('groups', GROUPS);
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  // Month headers
  it('should render a month header for each group', () => {
    const hdrs = el.querySelectorAll('.month-hdr');
    expect(hdrs.length).toBe(2);
    expect(hdrs[0].textContent!.trim()).toBe('April 2026');
    expect(hdrs[1].textContent!.trim()).toBe('March 2026');
  });

  it('should add .first class to the first month header', () => {
    const first = el.querySelector('.month-hdr.first');
    expect(first).toBeTruthy();
    expect(first!.textContent!.trim()).toBe('April 2026');
  });

  // Thread rail
  it('should render a .tx-group div for each group', () => {
    const groups = el.querySelectorAll('.tx-group');
    expect(groups.length).toBe(2);
  });

  // Row rendering
  it('should render a .tx-row for each transaction', () => {
    const rows = el.querySelectorAll('.tx-row');
    expect(rows.length).toBe(3);
  });

  it('should render .tx-name with securityName', () => {
    const names = el.querySelectorAll('.tx-name');
    expect(names[0].textContent!.trim()).toBe('Apple');
    expect(names[2].textContent!.trim()).toBe('Apple'); // sell
  });

  // Type tags
  it('should render .tx-type-tag.buy for buy transactions', () => {
    const tag = el.querySelector('.tx-type-tag.buy');
    expect(tag).toBeTruthy();
  });

  it('should render .tx-type-tag.sell for sell transactions', () => {
    const tag = el.querySelector('.tx-type-tag.sell');
    expect(tag).toBeTruthy();
  });

  it('should render .tx-type-tag.dividend for dividend transactions', () => {
    const tag = el.querySelector('.tx-type-tag.dividend');
    expect(tag).toBeTruthy();
  });

  // Dots
  it('should render a .tx-dot with transaction type class', () => {
    const dot = el.querySelector('.tx-dot.buy');
    expect(dot).toBeTruthy();
  });

  // Expand/collapse
  it('should not have .expanded on rows by default', () => {
    const expanded = el.querySelectorAll('.tx-row.expanded');
    expect(expanded.length).toBe(0);
  });

  it('should add .expanded to row on click', fakeAsync(() => {
    const row = el.querySelector('.tx-row') as HTMLElement;
    row.click();
    tick(0);
    fixture.detectChanges();
    expect(row.classList.contains('expanded')).toBeTrue();
  }));

  it('should collapse row on second click', fakeAsync(() => {
    const row = el.querySelector('.tx-row') as HTMLElement;
    row.click();
    tick(0);
    fixture.detectChanges();
    row.click();
    tick(0);
    fixture.detectChanges();
    expect(row.classList.contains('expanded')).toBeFalse();
  }));

  it('should only expand one row at a time', fakeAsync(() => {
    const rows = el.querySelectorAll('.tx-row');
    (rows[0] as HTMLElement).click();
    tick(0);
    fixture.detectChanges();
    (rows[1] as HTMLElement).click();
    tick(0);
    fixture.detectChanges();
    const expanded = el.querySelectorAll('.tx-row.expanded');
    expect(expanded.length).toBe(1);
    expect(expanded[0]).toBe(rows[1]);
  }));

  // Detail panel
  it('should have a .tx-detail in each row', () => {
    const details = el.querySelectorAll('.tx-detail');
    expect(details.length).toBe(3);
  });

  // Edit/Delete actions
  it('should emit editClick with the transaction when Edit is clicked in expanded row', fakeAsync(() => {
    const emitted: Transaction[] = [];
    fixture.componentInstance.editClick.subscribe((t: Transaction) => emitted.push(t));
    const row = el.querySelector('.tx-row') as HTMLElement;
    row.click();
    tick(0);
    fixture.detectChanges();
    const editBtn = row.querySelector('.tx-act-btn:not(.danger)') as HTMLElement;
    editBtn.click();
    tick(0);
    expect(emitted[0]).toEqual(BUY_TX);
  }));

  it('should emit deleteClick with the transaction when Delete is clicked in expanded row', fakeAsync(() => {
    const emitted: Transaction[] = [];
    fixture.componentInstance.deleteClick.subscribe((t: Transaction) => emitted.push(t));
    const row = el.querySelector('.tx-row') as HTMLElement;
    row.click();
    tick(0);
    fixture.detectChanges();
    const delBtn = row.querySelector('.tx-act-btn.danger') as HTMLElement;
    delBtn.click();
    tick(0);
    expect(emitted[0]).toEqual(BUY_TX);
  }));

  it('should not emit editClick click from bubbling to row toggle', fakeAsync(() => {
    const row = el.querySelector('.tx-row') as HTMLElement;
    row.click();
    tick(0);
    fixture.detectChanges();
    const editBtn = row.querySelector('.tx-act-btn:not(.danger)') as HTMLElement;
    editBtn.click();
    tick(0);
    fixture.detectChanges();
    // Row should remain expanded (stopPropagation prevented collapse)
    expect(row.classList.contains('expanded')).toBeTrue();
  }));

  // Loading state
  it('should show skeleton rows when loading = true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const skels = el.querySelectorAll('.tx-row-skel');
    expect(skels.length).toBeGreaterThan(0);
  });

  it('should not show data rows when loading = true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const rows = el.querySelectorAll('.tx-row:not(.tx-row-skel)');
    expect(rows.length).toBe(0);
  });

  // Empty
  it('should render nothing when groups is empty', () => {
    fixture.componentRef.setInput('groups', []);
    fixture.detectChanges();
    const rows = el.querySelectorAll('.tx-row');
    expect(rows.length).toBe(0);
  });

  // Sell perf
  it('should show realized P/L label for sell transactions with realizedPnL', () => {
    const row = el.querySelector('.tx-row:last-child') as HTMLElement;
    row.click();
    fixture.detectChanges();
    // perf is in meta area inline
    const perf = el.querySelector('.tx-perf-val');
    expect(perf).toBeTruthy();
  });
});
