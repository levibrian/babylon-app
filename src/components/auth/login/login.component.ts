import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

type AuthMode = 'login' | 'register';

export function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (confirm && password !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  mode = signal<AuthMode>(this.route.snapshot.data['mode'] ?? 'login');
  isLoginMode = computed(() => this.mode() === 'login');

  isLoading = signal(false);
  error = signal<string | null>(null);

  loginForm = this.fb.group({
    emailOrUsername: ['', Validators.required],
    password: ['', Validators.required],
  });

  registerForm = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  }, { validators: passwordMatchValidator });

  setMode(m: AuthMode): void {
    this.mode.set(m);
    this.error.set(null);
  }

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
    } catch (err: unknown) {
      const apiMessage = (err as { error?: { message?: string } })?.error?.message;
      const message = err instanceof Error ? err.message : undefined;
      this.error.set(apiMessage ?? message ?? 'Invalid credentials. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

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
    } catch (err: unknown) {
      const apiMessage = (err as { error?: { message?: string } })?.error?.message;
      const message = err instanceof Error ? err.message : undefined;
      this.error.set(apiMessage ?? message ?? 'Registration failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onGoogleSignIn(): void {
    this.authService.signInWithGoogle().catch(() => {
      this.error.set('Google sign-in failed. Please try again.');
    });
  }

  invalid(form: 'login' | 'register', field: string): boolean {
    const ctrl = form === 'login'
      ? this.loginForm.get(field)
      : this.registerForm.get(field);
    return !!ctrl?.invalid && !!ctrl?.touched;
  }

  invalidRegister(field: string): boolean {
    const ctrl = this.registerForm.get(field);
    if (field === 'confirmPassword') {
      return !!ctrl?.touched && (!!ctrl?.invalid || this.registerForm.hasError('passwordMismatch'));
    }
    return !!ctrl?.invalid && !!ctrl?.touched;
  }
}
