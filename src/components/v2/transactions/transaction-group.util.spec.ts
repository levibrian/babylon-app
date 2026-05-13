import { groupByMonth, MonthGroup } from './transaction-group.util';
import { Transaction } from '../../../models/transaction.model';

const tx = (id: string, date: string): Transaction => ({
  id, date, ticker: 'AAPL', transactionType: 'buy',
  shares: 1, sharePrice: 100, fees: 0, totalAmount: 100, securityName: 'Apple',
});

describe('groupByMonth', () => {
  it('returns empty array for empty input', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('groups transactions by month', () => {
    const result = groupByMonth([
      tx('1', '2026-04-10'),
      tx('2', '2026-04-22'),
      tx('3', '2026-03-15'),
    ]);
    expect(result.length).toBe(2);
    expect(result[0].label).toBe('April 2026');
    expect(result[1].label).toBe('March 2026');
  });

  it('sorts months newest first', () => {
    const result = groupByMonth([
      tx('1', '2026-01-01'),
      tx('2', '2026-04-01'),
      tx('3', '2026-02-01'),
    ]);
    expect(result.map(g => g.label)).toEqual(['April 2026', 'February 2026', 'January 2026']);
  });

  it('sorts transactions within a month newest first', () => {
    const result = groupByMonth([
      tx('1', '2026-04-05'),
      tx('2', '2026-04-22'),
    ]);
    expect(result[0].transactions[0].id).toBe('2');
    expect(result[0].transactions[1].id).toBe('1');
  });

  it('puts all transactions for a month in one group', () => {
    const result = groupByMonth([
      tx('1', '2026-04-10'),
      tx('2', '2026-04-22'),
      tx('3', '2026-04-01'),
    ]);
    expect(result.length).toBe(1);
    expect(result[0].transactions.length).toBe(3);
  });
});
