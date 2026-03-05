import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { AuthService } from '../../../services/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GoogleSigninButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  // ── Mode toggle (login ↔ register) ───────────────────────────────────────
  mode = signal<AuthMode>('login');
  isLoginMode = computed(() => this.mode() === 'login');

  // ── Shared loading / error state ─────────────────────────────────────────
  isLoading = signal(false);
  error = signal<string | null>(null);

  // ── Login form (Flow 5) ───────────────────────────────────────────────────
  loginForm = this.fb.group({
    emailOrUsername: ['', Validators.required],
    password: ['', Validators.required],
  });

  // ── Register form (Flows 3 & 4) ───────────────────────────────────────────
  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    // Allow /register route to pre-set register mode
    this.route.data.subscribe((data) => {
      if (data['mode'] === 'register') {
        this.mode.set('register');
      }
    });
  }

  setMode(m: AuthMode): void {
    this.mode.set(m);
    this.error.set(null);
  }

  // ── Flow 5: Local Login ───────────────────────────────────────────────────
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { emailOrUsername, password } = this.loginForm.value;
      await this.authService.login(emailOrUsername!, password!);
    } catch (err: any) {
      this.error.set(
        err?.error?.message ?? err?.message ?? 'Invalid credentials. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Flows 3 & 4: Register ─────────────────────────────────────────────────
  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { username, email, password } = this.registerForm.value;
      await this.authService.register(username!, email!, password!);
      // If email belongs to an existing Google user, the backend links them (Flow 4)
      // and returns a success AuthResponse — no special handling needed here.
    } catch (err: any) {
      this.error.set(
        err?.error?.message ?? err?.message ?? 'Registration failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Form field helpers ────────────────────────────────────────────────────
  invalid(form: 'login' | 'register', field: string): boolean {
    const ctrl = form === 'login'
      ? this.loginForm.get(field)
      : this.registerForm.get(field);
    return !!ctrl?.invalid && !!ctrl?.touched;
  }
}
