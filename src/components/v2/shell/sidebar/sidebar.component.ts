import {
  Component, ChangeDetectionStrategy, output, signal,
  inject, HostListener,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserStore } from '../../../../services/user.store';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  openDrawer = output<void>();

  private userStore = inject(UserStore);
  private authService = inject(AuthService);

  collapsed = signal(false);
  submenuOpen = signal(false);

  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    if (this.submenuOpen()) this.submenuOpen.set(false);
  }

  toggleSubmenu(): void {
    this.submenuOpen.update(v => !v);
  }

  closeSubmenu(): void {
    this.submenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.submenuOpen()) return;
    const target = event.target as Element;
    if (!target.closest('.user-item') && !target.closest('.user-submenu')) {
      this.submenuOpen.set(false);
    }
  }
}
