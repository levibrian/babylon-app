import { Component, ChangeDetectionStrategy, inject, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent {
  private authService = inject(AuthService);
  private eRef = inject(ElementRef);

  user = this.authService.currentUser;
  isOpen = signal(false);

  toggleDropdown() {
    this.isOpen.update(v => !v);
  }

  logout() {
    this.authService.logout(true);
    this.isOpen.set(false);
  }

  get initials(): string {
    const username = this.user()?.username || '';
    return username.slice(0, 2).toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
