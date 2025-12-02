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

/**
 * Interface for bulk transaction request (camelCase format).
 * Used by the bulk endpoint: api/v1/transactions/bulk
 */
export interface BulkTransactionRequestItem {
  ticker: string;
  transactionType: number; // Enum: Buy=0, Sell=1, Dividend=2, Split=3
  date: string; // DateOnly format: YYYY-MM-DD
  sharesQuantity: number;
  sharePrice: number;
  fees: number;
  tax: number;
  totalAmount: number;
  userId: string;
}

/**
 * Maps frontend NewTransactionData to bulk transaction request format.
 * Converts to camelCase and formats date as a string (YYYY-MM-DD) for DateOnly.
 * Returns an array directly (ASP.NET Core binds List<T> from array body).
 */
export function mapToBulkTransactionRequest(
  transactions: NewTransactionData[],
  userId: string
): BulkTransactionRequestItem[] {
  // Convert transaction type to numeric enum value
  const transactionTypeMap: Record<'buy' | 'sell' | 'dividend' | 'split', number> = {
    'buy': 0,
    'sell': 1,
    'dividend': 2,
    'split': 3,
  };

  return transactions.map(transactionData => {
    // Convert ISO date string to DateOnly format (YYYY-MM-DD)
    let dateFormatted: string;
    if (transactionData.date) {
      const dateObj = new Date(transactionData.date);
      // Format as YYYY-MM-DD
      dateFormatted = dateObj.toISOString().split('T')[0];
    } else {
      // Default to today if no date provided
      const today = new Date();
      dateFormatted = today.toISOString().split('T')[0];
    }

    return {
      ticker: transactionData.ticker,
      transactionType: transactionTypeMap[transactionData.transactionType],
      date: dateFormatted,
      sharesQuantity: transactionData.shares,
      sharePrice: transactionData.sharePrice,
      fees: transactionData.fees || 0,
      tax: transactionData.tax || 0,
      totalAmount: transactionData.totalAmount || 0,
      userId,
    };
  });
}

