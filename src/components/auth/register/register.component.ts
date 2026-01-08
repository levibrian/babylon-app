import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GoogleSigninButtonModule],
  templateUrl: './register.component.html',
  styleUrls: ['../login/login.component.scss'], // Reuse login styles
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private socialAuthService = inject(SocialAuthService);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // Google Auth listener is same - robust backends merge accounts by email
    this.socialAuthService.authState.subscribe(async (user) => {
      if (user && user.idToken) {
        this.isLoading.set(true);
        try {
          await this.authService.loginWithGoogle(user.idToken);
          this.isLoading.set(false);
        } catch (error) {
          this.isLoading.set(false);
          this.error.set('Google registration failed');
        }
      }
    });
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.error.set(null);

      try {
        const { email, password } = this.registerForm.value;
        await this.authService.register(email!, password!);
        // Navigation is handled in handleAuthSuccess inside AuthService
      } catch (err: any) {
        this.error.set(err?.error?.message || 'Registration failed. Please try again.');
      } finally {
        this.isLoading.set(false);
      }
    }
  }
}
