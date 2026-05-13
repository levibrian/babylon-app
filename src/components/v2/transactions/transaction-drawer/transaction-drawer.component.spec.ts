import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TransactionDrawerComponent } from './transaction-drawer.component';
import { Transaction, NewTransactionData } from '../../../../models/transaction.model';

const EDIT_TX: Transaction = {
  id: '1', date: '2026-04-22', ticker: 'AAPL', transactionType: 'buy',
  shares: 5, sharePrice: 192.34, fees: 0, totalAmount: 961.70, securityName: 'Apple',
};
const SECURITIES = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
];

describe('TransactionDrawerComponent', () => {
  let fixture: ComponentFixture<TransactionDrawerComponent>;
  let component: TransactionDrawerComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionDrawerComponent, ReactiveFormsModule],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('transaction', null);
    fixture.componentRef.setInput('securities', SECURITIES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  // Open/close
  it('should not have .open class on drawer when open = false', () => {
    const drawer = el.querySelector('.drawer');
    expect(drawer!.classList.contains('open')).toBeFalse();
  });

  it('should add .open class to drawer when open = true', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const drawer = el.querySelector('.drawer');
    expect(drawer!.classList.contains('open')).toBeTrue();
  });

  // Add mode
  it('should show "Add transaction" title in add mode', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const title = el.querySelector('.drawer-title-el');
    expect(title!.textContent!.trim()).toBe('Add transaction');
  });

  it('should show "Add transaction" on submit button in add mode', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const btn = el.querySelector('.btn-submit');
    expect(btn!.textContent!.trim()).toBe('Add transaction');
  });

  // Edit mode
  it('should show "Edit transaction" title in edit mode', () => {
    fixture.componentRef.setInput('transaction', EDIT_TX);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const title = el.querySelector('.drawer-title-el');
    expect(title!.textContent!.trim()).toBe('Edit transaction');
  });

  it('should show "Save changes" on submit button in edit mode', () => {
    fixture.componentRef.setInput('transaction', EDIT_TX);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const btn = el.querySelector('.btn-submit');
    expect(btn!.textContent!.trim()).toBe('Save changes');
  });

  it('should pre-fill form with transaction data in edit mode', () => {
    fixture.componentRef.setInput('transaction', EDIT_TX);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(component.form.value.ticker).toBe('AAPL');
    expect(component.form.value.date).toBe('2026-04-22');
    expect(Number(component.form.value.shares)).toBe(5);
    expect(Number(component.form.value.sharePrice)).toBe(192.34);
  });

  // Cancel
  it('should emit cancel when Cancel button is clicked', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    let cancelCount = 0;
    component.cancel.subscribe(() => cancelCount++);
    const btn = el.querySelector('.btn-cancel') as HTMLElement;
    btn.click();
    tick(0);
    expect(cancelCount).toBe(1);
  }));

  it('should emit cancel when overlay is clicked', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    let cancelCount = 0;
    component.cancel.subscribe(() => cancelCount++);
    const overlay = el.querySelector('.drawer-overlay') as HTMLElement;
    overlay.click();
    tick(0);
    expect(cancelCount).toBe(1);
  }));

  it('should emit cancel when close button is clicked', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    let cancelCount = 0;
    component.cancel.subscribe(() => cancelCount++);
    const btn = el.querySelector('.drawer-close') as HTMLElement;
    btn.click();
    tick(0);
    expect(cancelCount).toBe(1);
  }));

  // Type segmented control
  it('should show buy as active by default', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const activeBtn = el.querySelector('.ts-btn.active');
    expect(activeBtn!.getAttribute('data-type')).toBe('buy');
  });

  it('should switch active type when a type button is clicked', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const sellBtn = el.querySelector('.ts-btn[data-type="sell"]') as HTMLElement;
    sellBtn.click();
    tick(0);
    fixture.detectChanges();
    expect(component.selectedType()).toBe('sell');
    const activeBtn = el.querySelector('.ts-btn.active');
    expect(activeBtn!.getAttribute('data-type')).toBe('sell');
  }));

  // Computed total
  it('should display computed total when shares and price are entered', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    component.form.patchValue({ shares: 5, sharePrice: 100 });
    fixture.detectChanges();
    const totalEl = el.querySelector('.f-total-val');
    expect(totalEl!.textContent).toContain('500');
  });

  it('should display "€ —" when shares or price is empty', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const totalEl = el.querySelector('.f-total-val');
    expect(totalEl!.textContent!.trim()).toBe('€ —');
  });

  // Save
  it('should emit save with correct data when form is valid and submit is clicked', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const emitted: NewTransactionData[] = [];
    component.save.subscribe((d: NewTransactionData) => emitted.push(d));
    component.form.patchValue({ ticker: 'AAPL', date: '2026-05-01', shares: 3, sharePrice: 200 });
    fixture.detectChanges();
    const btn = el.querySelector('.btn-submit') as HTMLElement;
    btn.click();
    tick(0);
    expect(emitted.length).toBe(1);
    expect(emitted[0].ticker).toBe('AAPL');
    expect(emitted[0].transactionType).toBe('buy');
    expect(Number(emitted[0].shares)).toBe(3);
    expect(Number(emitted[0].sharePrice)).toBe(200);
    expect(Number(emitted[0].totalAmount)).toBeCloseTo(600);
  }));

  it('should not emit save when form is invalid', fakeAsync(() => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const emitted: NewTransactionData[] = [];
    component.save.subscribe((d: NewTransactionData) => emitted.push(d));
    // ticker is empty (required)
    component.form.patchValue({ ticker: '', date: '2026-05-01', shares: 3, sharePrice: 200 });
    fixture.detectChanges();
    const btn = el.querySelector('.btn-submit') as HTMLElement;
    btn.click();
    tick(0);
    expect(emitted.length).toBe(0);
  }));
});
