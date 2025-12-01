import { ApiTransaction } from '../models/api-response.model';
import { Transaction, NewTransactionData } from '../models/transaction.model';

/**
 * Maps an API transaction to a Transaction model.
 * This is a shared utility to ensure consistent mapping across the application.
 */
export function mapApiTransactionToTransaction(apiTransaction: ApiTransaction, fallbackTicker?: string): Transaction {
  // Convert Unix timestamp to ISO string
  const date = new Date(apiTransaction.date * 1000).toISOString();
  // Convert transaction type from "Buy"/"Sell"/"Dividend"/"Split" to lowercase
  const transactionType = apiTransaction.transactionType.toLowerCase() as 'buy' | 'sell' | 'dividend' | 'split';
  
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
  TransactionType: number; // Enum: Buy=0, Sell=1, Dividend=2, Split=3
  Date: string | null; // DateOnly format: YYYY-MM-DD
  SharesQuantity: number;
  SharePrice: number;
  Fees: number;
  TotalAmount?: number; // Total amount (required for dividends - Net Received, always 0 for splits)
  Tax?: number; // Tax withheld (for dividend transactions)
  UserId: string | null;
}

export function mapToCreateTransactionRequest(
  transactionData: NewTransactionData,
  userId: string | null = null
): CreateTransactionRequest {
  // Convert transaction type to numeric enum value expected by backend
  // Backend enum: Buy=0, Sell=1, Dividend=2, Split=3
  const transactionTypeMap: Record<'buy' | 'sell' | 'dividend' | 'split', number> = {
    'buy': 0,
    'sell': 1,
    'dividend': 2,
    'split': 3,
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
    transactionTypeEnum: transactionTypeMap[transactionData.transactionType],
    shares: transactionData.shares,
    sharesQuantity: transactionData.shares, // This will be mapped to SharesQuantity
    totalAmount: transactionData.totalAmount,
    tax: transactionData.tax
  });
  
  const request = {
    Ticker: transactionData.ticker,
    TransactionType: transactionTypeMap[transactionData.transactionType],
    Date: dateFormatted,
    SharesQuantity: transactionData.shares, // This is the split ratio for split transactions
    SharePrice: transactionData.sharePrice, // Must be 0 for splits
    Fees: transactionData.fees, // Typically 0 for splits
    TotalAmount: transactionData.totalAmount, // Include totalAmount (required for dividends, always 0 for splits)
    Tax: transactionData.tax, // Typically 0 for splits
    UserId: userId,
  };
  
  console.log('Final CreateTransactionRequest:', request);
  console.log('SharesQuantity value:', request.SharesQuantity, 'Type:', typeof request.SharesQuantity);
  
  return request;
}

