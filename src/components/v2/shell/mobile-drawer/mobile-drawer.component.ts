import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-mobile-drawer',
  standalone: true,
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDrawerComponent {
  open = input<boolean>(false);
  close = output<void>();
}
