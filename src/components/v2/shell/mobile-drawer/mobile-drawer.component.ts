import {
  Component, ChangeDetectionStrategy, input, output,
  inject, signal, effect,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserStore } from '../../../../services/user.store';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-mobile-drawer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-drawer.component.html',
  styleUrl: './mobile-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDrawerComponent {
  open = input<boolean>(false);
  close = output<void>();

  visible = signal(false);
  animating = signal(false);

  private userStore = inject(UserStore);
  private authService = inject(AuthService);

  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        this.visible.set(true);
        requestAnimationFrame(() => this.animating.set(true));
      } else {
        this.animating.set(false);
        setTimeout(() => this.visible.set(false), 230);
      }
    });
  }

  closeDrawer(): void {
    this.close.emit();
  }

  logout(): void {
    this.authService.logout();
    this.closeDrawer();
  }
}
