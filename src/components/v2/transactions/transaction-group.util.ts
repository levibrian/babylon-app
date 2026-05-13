import { Transaction } from '../../../models/transaction.model';

export interface MonthGroup {
  label: string;
  transactions: Transaction[];
}

export function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const map = new Map<string, Transaction[]>();
  for (const tx of sorted) {
    const key = tx.date.substring(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }

  return Array.from(map.entries()).map(([key, txs]) => ({
    label: new Date(key + '-01T12:00:00').toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    }),
    transactions: txs,
  }));
}
