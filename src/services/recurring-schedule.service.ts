import { Injectable, Signal, signal, inject } from '@angular/core';
import { RecurringSchedule, CreateRecurringScheduleRequest } from '../models/recurring-schedule.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecurringScheduleService {
  private http = inject(HttpClient);
  private readonly _schedules = signal<RecurringSchedule[]>([]);
  private readonly _loading = signal(false);

  public readonly schedules: Signal<RecurringSchedule[]> = this._schedules.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();

  async loadSchedules(): Promise<void> {
    if (this._loading()) {
      return;
    }

    try {
      this._loading.set(true);

      const data = await lastValueFrom(this.http.get<RecurringSchedule[]>(`${environment.apiUrl}/api/v1/recurring-schedules`));
      this._schedules.set(data);

    } catch (err) {
      console.error('Error loading recurring schedules:', err);
      this._schedules.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  async addSchedule(request: CreateRecurringScheduleRequest): Promise<void> {
    try {
      await lastValueFrom(this.http.post(`${environment.apiUrl}/api/v1/recurring-schedules`, request));
      await this.loadSchedules();

    } catch (err) {
      console.error('Error adding recurring schedule:', err);
      throw err;
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      const currentSchedules = this._schedules();
      this._schedules.set(currentSchedules.filter(s => s.id !== id));

      await lastValueFrom(this.http.delete(`${environment.apiUrl}/api/v1/recurring-schedules/${id}`));
      await this.loadSchedules();

    } catch (err) {
      console.error('Error deleting recurring schedule:', err);
      this._schedules.set(this._schedules()); // Refresh on error
      throw err;
    }
  }
}

