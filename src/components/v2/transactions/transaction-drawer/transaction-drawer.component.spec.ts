import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TransactionDrawerComponent } from './transaction-drawer.component';
import { Transaction, NewTransactionData } from '../../../../models/transaction.model';

const EDIT_TX: Transaction = {
  id: '1', date: '2026-04-22', ticker: 'AAPL', transactionType: 'buy',
  shares: 5, sharePrice: 192.34, fees: 0, totalAmount: 961.70, securityName: 'Apple',
};

const DIV_TX: Transaction = {
  id: '3', date: '2026-04-15', ticker: 'VWCE', transactionType: 'dividend',
  shares: 100, sharePrice: 0, fees: 0, totalAmount: 42.00, tax: 8.00, securityName: 'Vanguard ETF',
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

  // ── Dividend form fields ──────────────────────────────────────────────────

  describe('dividend form fields', () => {
    beforeEach(fakeAsync(() => {
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      const divBtn = el.querySelector('.ts-btn[data-type="dividend"]') as HTMLElement;
      divBtn.click();
      tick(0);
      fixture.detectChanges();
    }));

    it('should show shares-held field when dividend is selected', () => {
      expect(el.querySelector('#f-div-shares')).toBeTruthy();
    });

    it('should show net-amount field when dividend is selected', () => {
      expect(el.querySelector('#f-div-net')).toBeTruthy();
    });

    it('should show tax-withheld field when dividend is selected', () => {
      expect(el.querySelector('#f-div-tax')).toBeTruthy();
    });

    it('should show € — in per-share calc when fields are empty', () => {
      const calcVal = el.querySelector('.f-calc-val') as HTMLElement;
      expect(calcVal?.textContent?.trim()).toBe('€ —');
    });

    it('should update per-share calc when shares, net, and tax are filled', fakeAsync(() => {
      component.form.patchValue({ divShares: 100, divNet: 42, divTax: 8 });
      tick(0);
      fixture.detectChanges();
      const calcVal = el.querySelector('.f-calc-val') as HTMLElement;
      // (42 + 8) / 100 = 0.50
      expect(calcVal?.textContent).toContain('0,50');
    }));
  });

  // ── divPerShare computed signal ───────────────────────────────────────────

  describe('divPerShare computed', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
    });

    it('should return null when shares is 0', () => {
      component.form.patchValue({ divShares: 0, divNet: 42, divTax: 8 });
      fixture.detectChanges();
      expect(component.divPerShare()).toBeNull();
    });

    it('should return null when net is 0', () => {
      component.form.patchValue({ divShares: 100, divNet: 0, divTax: 8 });
      fixture.detectChanges();
      expect(component.divPerShare()).toBeNull();
    });

    it('should calculate (net + tax) / shares correctly', () => {
      component.form.patchValue({ divShares: 100, divNet: 42, divTax: 8 });
      fixture.detectChanges();
      expect(component.divPerShare()).toBeCloseTo(0.50, 4);
    });

    it('should treat null tax as 0', () => {
      component.form.patchValue({ divShares: 100, divNet: 42, divTax: null });
      fixture.detectChanges();
      expect(component.divPerShare()).toBeCloseTo(0.42, 4);
    });
  });

  // ── Detail mode ───────────────────────────────────────────────────────────

  describe('detail mode - buy transaction', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'detail');
      fixture.componentRef.setInput('transaction', EDIT_TX);
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
    });

    it('should show .drawer-body-detail', () => {
      expect(el.querySelector('.drawer-body-detail')).toBeTruthy();
    });

    it('should hide form body', () => {
      const formBody = el.querySelector('.drawer-body-form') as HTMLElement;
      expect(formBody).toBeFalsy();
    });

    it('should show ticker in hero', () => {
      const ticker = el.querySelector('.dd-ticker') as HTMLElement;
      expect(ticker?.textContent?.trim()).toBe('AAPL');
    });

    it('should show security name in hero', () => {
      const name = el.querySelector('.dd-name') as HTMLElement;
      expect(name?.textContent?.trim()).toBe('Apple');
    });

    it('should emit editClicked with transaction when Edit is clicked', fakeAsync(() => {
      const emitted: Transaction[] = [];
      component.editClicked.subscribe((t: Transaction) => emitted.push(t));
      const btn = el.querySelector('.btn-detail-edit') as HTMLElement;
      btn.click();
      tick(0);
      expect(emitted[0]).toEqual(EDIT_TX);
    }));

    it('should emit deleteClicked with transaction when Delete is clicked', fakeAsync(() => {
      const emitted: Transaction[] = [];
      component.deleteClicked.subscribe((t: Transaction) => emitted.push(t));
      const btn = el.querySelector('.btn-detail-del') as HTMLElement;
      btn.click();
      tick(0);
      expect(emitted[0]).toEqual(EDIT_TX);
    }));

    it('should not show yield section for buy transaction', () => {
      expect(el.querySelector('.dd-section-yield')).toBeFalsy();
    });
  });

  describe('detail mode - dividend transaction', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('mode', 'detail');
      fixture.componentRef.setInput('transaction', DIV_TX);
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
    });

    it('should show yield section for dividend', () => {
      expect(el.querySelector('.dd-section-yield')).toBeTruthy();
    });

    it('should show per-share dividend in yield section', () => {
      const yieldSection = el.querySelector('.dd-section-yield') as HTMLElement;
      // (42 + 8) / 100 = 0.50
      expect(yieldSection?.textContent).toContain('0,50');
    });

    it('should show shares held in yield section', () => {
      const yieldSection = el.querySelector('.dd-section-yield') as HTMLElement;
      expect(yieldSection?.textContent).toContain('100');
    });
  });
});
