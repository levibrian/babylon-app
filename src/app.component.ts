import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [RouterOutlet, NgxSonnerToaster],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor() {
    // Handle Google OAuth redirect callback — id_token arrives in the URL fragment.
    const rawHash = window.location.hash;
    if (rawHash.startsWith('#id_token=') || rawHash.includes('&id_token=')) {
      const idToken = new URLSearchParams(rawHash.substring(1)).get('id_token');
      if (idToken) {
        history.replaceState(null, '', `${window.location.origin}/#/login`);
        inject(AuthService).loginWithGoogle(idToken).catch(() => {});
      }
    }
  }
}