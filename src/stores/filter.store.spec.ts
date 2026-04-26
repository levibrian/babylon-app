import { TestBed } from '@angular/core/testing';
import { FilterStore, ALL_ASSET_CLASSES } from './filter.store';

describe('FilterStore', () => {
  let store: FilterStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(FilterStore);
  });

  it('starts with all asset classes active', () => {
    expect(store.allActive()).toBeTrue();
    for (const cls of ALL_ASSET_CLASSES) {
      expect(store.isActive(cls)).toBeTrue();
    }
  });

  it('toggle removes an active class', () => {
    store.toggle('ETF');
    expect(store.isActive('ETF')).toBeFalse();
    expect(store.allActive()).toBeFalse();
  });

  it('toggle re-adds an inactive class', () => {
    store.toggle('ETF');
    store.toggle('ETF');
    expect(store.isActive('ETF')).toBeTrue();
    expect(store.allActive()).toBeTrue();
  });

  it('selectAll restores all classes after partial deselection', () => {
    store.toggle('Stock');
    store.toggle('Bond');
    store.selectAll();
    expect(store.allActive()).toBeTrue();
  });

  it('can deselect all classes', () => {
    for (const cls of ALL_ASSET_CLASSES) {
      store.toggle(cls);
    }
    expect(store.allActive()).toBeFalse();
    for (const cls of ALL_ASSET_CLASSES) {
      expect(store.isActive(cls)).toBeFalse();
    }
  });
});
