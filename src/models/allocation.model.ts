/**
 * Allocation Strategy Models
 * Matches backend DTOs for allocation strategy management
 */

export interface AllocationStrategyDto {
  ticker: string;
  targetPercentage: number;
  isEnabledForWeekly?: boolean;
  isEnabledForBiWeekly?: boolean;
  isEnabledForMonthly?: boolean;
}

export interface AllocationStrategyResponse {
  allocations: AllocationStrategyDto[];
  totalAllocated: number;
}

export interface SetAllocationStrategyRequest {
  allocations: AllocationStrategyDto[];
}

