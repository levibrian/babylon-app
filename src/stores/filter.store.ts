import { Injectable, computed, signal } from '@angular/core';

export type AssetClass = 'Stock' | 'ETF' | 'Bond' | 'Crypto';

export const ALL_ASSET_CLASSES: AssetClass[] = ['Stock', 'ETF', 'Bond', 'Crypto'];

@Injectable({ providedIn: 'root' })
export class FilterStore {
  private readonly _active = signal<Set<AssetClass>>(new Set(ALL_ASSET_CLASSES));

  readonly active = this._active.asReadonly();
  readonly allActive = computed(() => this._active().size === ALL_ASSET_CLASSES.length);

  toggle(cls: AssetClass): void {
    const next = new Set(this._active());
    if (next.has(cls)) {
      next.delete(cls);
    } else {
      next.add(cls);
    }
    this._active.set(next);
  }

  selectAll(): void {
    this._active.set(new Set(ALL_ASSET_CLASSES));
  }

  isActive(cls: AssetClass): boolean {
    return this._active().has(cls);
  }
}
