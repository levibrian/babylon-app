import { ApiTransaction } from '../models/api-response.model';
import { Transaction, NewTransactionData } from '../models/transaction.model';

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
    tax: apiTransaction.tax,
    securityName: apiTransaction.securityName,
    securityType: apiTransaction.securityType,
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

/**
 * Maps frontend NewTransactionData to backend CreateTransactionRequest format.
 * Converts camelCase to PascalCase and formats data for the C# API.
 */
export interface CreateTransactionRequest {
  Ticker: string;
  TransactionType: 'Buy' | 'Sell' | 'Dividend';
  Date: string | null; // DateOnly format: YYYY-MM-DD
  SharesQuantity: number;
  SharePrice: number;
  Fees: number;
  TotalAmount?: number; // Total amount (required for dividends - Net Received)
  Tax?: number; // Tax withheld (for dividend transactions)
  UserId: string | null;
}

export function mapToCreateTransactionRequest(
  transactionData: NewTransactionData,
  userId: string | null = null
): CreateTransactionRequest {
  // Convert transaction type to capitalized format expected by backend
  const transactionTypeMap: Record<'buy' | 'sell' | 'dividend', 'Buy' | 'Sell' | 'Dividend'> = {
    'buy': 'Buy',
    'sell': 'Sell',
    'dividend': 'Dividend',
  };
  
  // Convert ISO date string to DateOnly format (YYYY-MM-DD)
  let dateFormatted: string | null = null;
  if (transactionData.date) {
    const dateObj = new Date(transactionData.date);
    // Format as YYYY-MM-DD
    dateFormatted = dateObj.toISOString().split('T')[0];
  }
  
  // Debug logging
  console.log('Mapping to CreateTransactionRequest:', {
    transactionType: transactionData.transactionType,
    totalAmount: transactionData.totalAmount,
    tax: transactionData.tax
  });
  
  const request = {
    Ticker: transactionData.ticker,
    TransactionType: transactionTypeMap[transactionData.transactionType],
    Date: dateFormatted,
    SharesQuantity: transactionData.shares,
    SharePrice: transactionData.sharePrice,
    Fees: transactionData.fees,
    TotalAmount: transactionData.totalAmount, // Include totalAmount (required for dividends, calculated for buy/sell)
    Tax: transactionData.tax,
    UserId: userId,
  };
  
  console.log('Final CreateTransactionRequest:', request);
  
  return request;
}

