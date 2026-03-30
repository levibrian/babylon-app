export interface DividendMonth {
  month: number;
  year: number;
  amount: number;
  label: string;
}

export interface DividendTrackerResponse {
  paid: DividendMonth[];
  projected: DividendMonth[];
}
