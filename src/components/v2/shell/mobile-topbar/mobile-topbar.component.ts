import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-mobile-topbar',
  standalone: true,
  template: `<div class="mobile-topbar-stub"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTopbarComponent {
  openMenu = output<void>();
}
