export interface RecurringSchedule {
  id: string;
  userId: string;
  securityId: string;
  ticker: string;        // Flattened from Security
  securityName: string;  // Flattened from Security
  platform?: string;     // e.g. "Trade Republic"
  targetAmount?: number; // Informational "Goal" amount
  isActive: boolean;
}

export interface CreateRecurringScheduleRequest {
  ticker: string;
  securityName: string;
  platform?: string;
  targetAmount?: number;
}

