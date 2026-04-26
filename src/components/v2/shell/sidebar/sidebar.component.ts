import { Component, ChangeDetectionStrategy, output } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  template: `<div class="sidebar-stub"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  openDrawer = output<void>();
}
