import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { UserStore } from '../../../../services/user.store';

@Component({
  selector: 'app-mobile-topbar',
  standalone: true,
  imports: [],
  templateUrl: './mobile-topbar.component.html',
  styleUrl: './mobile-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTopbarComponent {
  openMenu = output<void>();

  private userStore = inject(UserStore);
  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }
}
