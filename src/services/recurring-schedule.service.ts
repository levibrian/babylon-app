import { Injectable, Signal, signal } from '@angular/core';
import { RecurringSchedule, CreateRecurringScheduleRequest } from '../models/recurring-schedule.model';

import { environment } from '../environments/environment';

const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

@Injectable({
  providedIn: 'root',
})
export class RecurringScheduleService {
  private readonly _schedules = signal<RecurringSchedule[]>([]);
  private readonly _loading = signal(false);

  public readonly schedules: Signal<RecurringSchedule[]> = this._schedules.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();

  async loadSchedules(): Promise<void> {
    // Prevent multiple simultaneous loads
    if (this._loading()) {
      return;
    }

    try {
      // Set loading state immediately to show loading indicator
      this._loading.set(true);

      const response = await fetch(`${environment.apiUrl}/api/v1/recurring-schedules/${USER_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recurring schedules: ${response.status} ${response.statusText}`);
      }

      const data: RecurringSchedule[] = await response.json();
      this._schedules.set(data);

    } catch (err) {
      console.error('Error loading recurring schedules:', err);
      this._schedules.set([]); // Clear on error
    } finally {
      this._loading.set(false);
    }
  }

  async addSchedule(request: CreateRecurringScheduleRequest): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrl}/api/v1/recurring-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to create recurring schedule: ${response.status} ${response.statusText}`);
      }

      // Refetch list on success
      await this.loadSchedules();

    } catch (err) {
      console.error('Error adding recurring schedule:', err);
      throw err;
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      // Optimistic update: remove from signal immediately
      const currentSchedules = this._schedules();
      this._schedules.set(currentSchedules.filter(s => s.id !== id));

      const response = await fetch(`${environment.apiUrl}/api/v1/recurring-schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert optimistic update on error
        this._schedules.set(currentSchedules);
        throw new Error(`Failed to delete recurring schedule: ${response.status} ${response.statusText}`);
      }

      // Refetch to ensure consistency with backend
      await this.loadSchedules();

    } catch (err) {
      console.error('Error deleting recurring schedule:', err);
      throw err;
    }
  }
}

