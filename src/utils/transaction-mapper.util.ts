import { ApiTransaction } from '../models/api-response.model';
import { Transaction } from '../models/transaction.model';

/**
 * Maps an API transaction to a Transaction model.
 * This is a shared utility to ensure consistent mapping across the application.
 */
export function mapApiTransactionToTransaction(apiTransaction: ApiTransaction, fallbackTicker?: string): Transaction {
  // Convert Unix timestamp to ISO string
  const date = new Date(apiTransaction.date * 1000).toISOString();
  // Convert transaction type from "Buy"/"Sell" to lowercase "buy"/"sell"
  const transactionType = apiTransaction.transactionType.toLowerCase() as 'buy' | 'sell' | 'dividend';
  
  return {
    id: apiTransaction.id,
    ticker: apiTransaction.ticker || fallbackTicker || '',
    date: date,
    transactionType: transactionType,
    shares: apiTransaction.sharesQuantity,
    sharePrice: apiTransaction.sharePrice,
    fees: apiTransaction.fees,
    totalAmount: apiTransaction.totalAmount,
    securityName: apiTransaction.securityName,
  };
}

/**
 * Maps an array of API transactions to Transaction models.
 */
export function mapApiTransactionsToTransactions(
  apiTransactions: ApiTransaction[],
  fallbackTicker?: string
): Transaction[] {
  return apiTransactions.map(t => mapApiTransactionToTransaction(t, fallbackTicker));
}

