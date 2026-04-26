# Login / Register Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visual layer of `LoginComponent` with the approved SPEC-003-12 dark split-screen design, matching the prototype exactly.

**Architecture:** In-place replacement of `.html` and `.scss`; three additive changes to `.ts`; one method added to `AuthService`. Auth logic, routes, and guards are untouched. `fullName` is captured in the register form but not sent to the API (no `RegisterPayload` changes).

**Tech Stack:** Angular 20 standalone components, Angular Signals, Reactive Forms, SCSS, `@abacritt/angularx-social-login`

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/services/auth.service.ts` | Modify | Add `signInWithGoogle()` method; add `GoogleLoginProvider` to import |
| `src/components/auth/login/login.component.ts` | Modify | Add `fullName` + `confirmPassword` to register form; add `passwordMatchValidator`; add `invalidRegister()` helper; add `onGoogleSignIn()` wrapper; remove `GoogleSigninButtonModule` import |
| `src/components/auth/login/login.component.html` | Replace | Full split-screen layout matching SPEC-003-12 prototype |
| `src/components/auth/login/login.component.scss` | Replace | Dark theme CSS matching SPEC-003-12 prototype |
| `src/components/auth/login/login.component.spec.ts` | Create | Component + validator tests |

---

## Task 1: Add `signInWithGoogle()` to `AuthService`

**Files:**
- Modify: `src/services/auth.service.ts`
- Create: `src/services/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/auth.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('AuthService.signInWithGoogle', () => {
  let service: AuthService;
  let socialAuthService: jasmine.SpyObj<SocialAuthService>;

  beforeEach(() => {
    const socialAuthSpy = jasmine.createSpyObj('SocialAuthService', ['signIn'], {
      authState: { subscribe: () => {} },
    });
    socialAuthSpy.signIn.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [
        AuthService,
        { provide: SocialAuthService, useValue: socialAuthSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    socialAuthService = TestBed.inject(SocialAuthService) as jasmine.SpyObj<SocialAuthService>;
  });

  it('calls SocialAuthService.signIn with GoogleLoginProvider', async () => {
    await service.signInWithGoogle();
    expect(socialAuthService.signIn).toHaveBeenCalledWith(GoogleLoginProvider.PROVIDER_ID);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd /mnt/d/Repo/babylon-app
npx ng test --include="src/services/auth.service.spec.ts" --watch=false
```

Expected: FAIL — `signInWithGoogle is not a function`

- [ ] **Step 3: Add `signInWithGoogle()` to `AuthService`**

In `src/services/auth.service.ts`, add `GoogleLoginProvider` to the existing import:

```typescript
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
```

Add this method after `loginWithGoogle()`:

```typescript
async signInWithGoogle(): Promise<void> {
  await this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
  // The authState subscription in the constructor handles the response.
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx ng test --include="src/services/auth.service.spec.ts" --watch=false
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/auth.service.ts src/services/auth.service.spec.ts
git commit -m "feat(auth): add signInWithGoogle() to AuthService"
```

---

## Task 2: Update `login.component.ts`

**Files:**
- Modify: `src/components/auth/login/login.component.ts`
- Create: `src/components/auth/login/login.component.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/auth/login/login.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AbstractControl } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login', 'register', 'signInWithGoogle'
    ]);
    authServiceSpy.login.and.returnValue(Promise.resolve());
    authServiceSpy.register.and.returnValue(Promise.resolve());
    authServiceSpy.signInWithGoogle.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivatedRoute, useValue: { data: of({ mode: 'login' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('passwordMatchValidator', () => {
    it('returns null when passwords match', () => {
      component.registerForm.patchValue({ password: 'secret123', confirmPassword: 'secret123' });
      expect(component.registerForm.errors).toBeNull();
    });

    it('sets passwordMismatch error when passwords differ', () => {
      component.registerForm.patchValue({ password: 'secret123', confirmPassword: 'different' });
      expect(component.registerForm.hasError('passwordMismatch')).toBeTrue();
    });
  });

  describe('invalidRegister()', () => {
    beforeEach(() => component.setMode('register'));

    it('returns false for untouched valid field', () => {
      expect(component.invalidRegister('fullName')).toBeFalse();
    });

    it('returns true for touched empty required field', () => {
      const ctrl = component.registerForm.get('fullName')!;
      ctrl.markAsTouched();
      expect(component.invalidRegister('fullName')).toBeTrue();
    });

    it('returns true for confirmPassword when passwords mismatch and touched', () => {
      component.registerForm.patchValue({ password: 'secret123', confirmPassword: 'diff' });
      component.registerForm.get('confirmPassword')!.markAsTouched();
      expect(component.invalidRegister('confirmPassword')).toBeTrue();
    });

    it('returns false for confirmPassword when passwords match and touched', () => {
      component.registerForm.patchValue({ password: 'secret123', confirmPassword: 'secret123' });
      component.registerForm.get('confirmPassword')!.markAsTouched();
      expect(component.invalidRegister('confirmPassword')).toBeFalse();
    });
  });

  describe('onGoogleSignIn()', () => {
    it('calls authService.signInWithGoogle()', () => {
      component.onGoogleSignIn();
      expect(authServiceSpy.signInWithGoogle).toHaveBeenCalled();
    });
  });

  describe('setMode()', () => {
    it('switches to register mode', () => {
      component.setMode('register');
      expect(component.isLoginMode()).toBeFalse();
    });

    it('clears error when switching mode', () => {
      component['error'].set('some error');
      component.setMode('register');
      expect(component.error()).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx ng test --include="src/components/auth/login/login.component.spec.ts" --watch=false
```

Expected: FAIL — `invalidRegister is not a function`, `onGoogleSignIn is not a function`, `passwordMismatch` errors missing

- [ ] **Step 3: Update `login.component.ts`**

Replace the entire file with:

```typescript
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
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

type AuthMode = 'login' | 'register';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
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
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  protected authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  mode = signal<AuthMode>('login');
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

  ngOnInit(): void {
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
    } catch (err: any) {
      this.error.set(
        err?.error?.message ?? err?.message ?? 'Registration failed. Please try again.'
      );
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx ng test --include="src/components/auth/login/login.component.spec.ts" --watch=false
```

Expected: PASS all tests

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/login/login.component.ts src/components/auth/login/login.component.spec.ts
git commit -m "feat(auth): add register form fields, validator, and Google sign-in trigger"
```

---

## Task 3: Replace `login.component.html`

**Files:**
- Replace: `src/components/auth/login/login.component.html`

- [ ] **Step 1: Replace the template**

Replace the entire contents of `src/components/auth/login/login.component.html` with:

```html
<div class="auth-shell">

  <!-- LEFT PANEL — decorative, desktop only -->
  <div class="auth-left">
    <div class="auth-left-bg"></div>
    <div class="orb"></div>

    <div class="chart-preview">
      <div class="chart-card">
        <div class="cc-label">Portfolio value</div>
        <div class="cc-value">€42,816.40</div>
        <div class="cc-change">↑ +€4,312 · +11.2% this year</div>

        <svg class="cc-chart" viewBox="0 0 340 80" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(123,47,190,0.18)"/>
              <stop offset="100%" stop-color="rgba(123,47,190,0)"/>
            </linearGradient>
          </defs>
          <path d="M0,62 C20,60 35,55 55,48 C75,41 90,45 110,38 C130,31 145,34 165,26 C185,18 200,22 220,16 C240,10 255,14 275,8 C295,2 315,6 340,4 L340,80 L0,80 Z" fill="url(#chartGrad)"/>
          <path d="M0,62 C20,60 35,55 55,48 C75,41 90,45 110,38 C130,31 145,34 165,26 C185,18 200,22 220,16 C240,10 255,14 275,8 C295,2 315,6 340,4" stroke="#7B2FBE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <div class="cc-holdings">
          <div class="cc-holding">
            <div class="ch-left">
              <div class="ch-dot" style="background:#27C97A"></div>
              <div class="ch-name">Vanguard FTSE</div>
            </div>
            <div class="ch-right">
              <div class="ch-val">€20,140</div>
              <div class="ch-pct">+9.4%</div>
            </div>
          </div>
          <div class="cc-holding">
            <div class="ch-left">
              <div class="ch-dot" style="background:#818CF8"></div>
              <div class="ch-name">Apple</div>
            </div>
            <div class="ch-right">
              <div class="ch-val">€11,820</div>
              <div class="ch-pct">+14.1%</div>
            </div>
          </div>
          <div class="cc-holding">
            <div class="ch-left">
              <div class="ch-dot" style="background:#BB94E6"></div>
              <div class="ch-name">NVIDIA</div>
            </div>
            <div class="ch-right">
              <div class="ch-val">€6,430</div>
              <div class="ch-pct neg">-2.8%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-left-copy">
      <div class="alc-tagline">Invest with clarity.</div>
      <div class="alc-sub">Track every position, every entry, every gain — with precision.</div>
    </div>
  </div>

  <!-- RIGHT PANEL — form -->
  <div class="auth-right">

    <div class="auth-logo">
      <svg class="logo-mark" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" stroke="rgba(123,47,190,0.5)" stroke-width="1"/>
        <circle cx="14" cy="14" r="7" fill="rgba(123,47,190,0.2)" stroke="#7B2FBE" stroke-width="1"/>
        <circle cx="14" cy="14" r="3" fill="#7B2FBE"/>
      </svg>
      <span class="logo-word">Babylon</span>
    </div>

    <div class="auth-heading">{{ isLoginMode() ? 'Welcome back' : 'Create account' }}</div>
    <div class="auth-subhead">
      {{ isLoginMode() ? 'Sign in to your account to continue.' : 'Start tracking your investments today.' }}
    </div>

    <div class="mode-toggle">
      <button class="mode-btn" [class.active]="isLoginMode()" (click)="setMode('login')" type="button">Sign in</button>
      <button class="mode-btn" [class.active]="!isLoginMode()" (click)="setMode('register')" type="button">Create account</button>
    </div>

    @if (error()) {
      <div class="error-banner" role="alert">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ error() }}</span>
      </div>
    }

    <!-- LOGIN FORM -->
    @if (isLoginMode()) {
      <form class="auth-form" [formGroup]="loginForm" (ngSubmit)="onLogin()" novalidate>
        <div class="f-field">
          <label class="f-label" for="inp-email">Email</label>
          <input class="f-input" id="inp-email" type="email" formControlName="emailOrUsername"
            placeholder="you@example.com" autocomplete="email"
            [class.error]="invalid('login', 'emailOrUsername')">
          @if (invalid('login', 'emailOrUsername')) {
            <div class="f-err">Please enter your email or username.</div>
          }
        </div>

        <div class="f-field">
          <label class="f-label" for="inp-password-login">Password</label>
          <input class="f-input" id="inp-password-login" type="password" formControlName="password"
            placeholder="Password" autocomplete="current-password"
            [class.error]="invalid('login', 'password')">
          @if (invalid('login', 'password')) {
            <div class="f-err">Password is required.</div>
          }
        </div>

        <div class="forgot-row">
          <a class="forgot-link" href="#">Forgot password?</a>
        </div>

        <button class="auth-submit" [class.loading]="isLoading()" type="submit" [disabled]="isLoading()">
          <span class="submit-text">Sign in</span>
          <div class="submit-spinner"></div>
        </button>
      </form>
    }

    <!-- REGISTER FORM -->
    @if (!isLoginMode()) {
      <form class="auth-form" [formGroup]="registerForm" (ngSubmit)="onRegister()" novalidate>
        <div class="f-field">
          <label class="f-label" for="inp-fullname">Full name</label>
          <input class="f-input" id="inp-fullname" type="text" formControlName="fullName"
            placeholder="Your name" autocomplete="name"
            [class.error]="invalidRegister('fullName')">
          @if (invalidRegister('fullName')) {
            <div class="f-err">Full name is required.</div>
          }
        </div>

        <div class="f-field">
          <label class="f-label" for="inp-username">Username</label>
          <input class="f-input" id="inp-username" type="text" formControlName="username"
            placeholder="username" autocomplete="username"
            [class.error]="invalidRegister('username')">
          @if (invalidRegister('username')) {
            <div class="f-err">Username is required (min. 3 characters).</div>
          }
        </div>

        <div class="f-field">
          <label class="f-label" for="inp-email-reg">Email</label>
          <input class="f-input" id="inp-email-reg" type="email" formControlName="email"
            placeholder="you@example.com" autocomplete="email"
            [class.error]="invalidRegister('email')">
          @if (invalidRegister('email')) {
            <div class="f-err">A valid email is required.</div>
          }
        </div>

        <div class="f-field">
          <label class="f-label" for="inp-password-reg">Password</label>
          <input class="f-input" id="inp-password-reg" type="password" formControlName="password"
            placeholder="Password" autocomplete="new-password"
            [class.error]="invalidRegister('password')">
          @if (invalidRegister('password')) {
            <div class="f-err">Password must be at least 8 characters.</div>
          }
        </div>

        <div class="f-field">
          <label class="f-label" for="inp-confirm">Confirm password</label>
          <input class="f-input" id="inp-confirm" type="password" formControlName="confirmPassword"
            placeholder="Confirm password" autocomplete="new-password"
            [class.error]="invalidRegister('confirmPassword')">
          @if (invalidRegister('confirmPassword')) {
            <div class="f-err">Passwords do not match.</div>
          }
        </div>

        <button class="auth-submit" [class.loading]="isLoading()" type="submit" [disabled]="isLoading()">
          <span class="submit-text">Create account</span>
          <div class="submit-spinner"></div>
        </button>
      </form>
    }

    <div class="auth-divider">
      <div class="div-line"></div>
      <div class="div-text">or</div>
      <div class="div-line"></div>
    </div>

    <button class="google-btn" type="button" (click)="onGoogleSignIn()">
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>

    <div class="auth-terms">
      @if (isLoginMode()) {
        By signing in you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      } @else {
        By creating an account you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      }
    </div>

  </div>
</div>
```

- [ ] **Step 2: Verify the app compiles**

```bash
npx ng build --configuration=development 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/login/login.component.html
git commit -m "feat(auth): replace login template with SPEC-003-12 split-screen layout"
```

---

## Task 4: Replace `login.component.scss`

**Files:**
- Replace: `src/components/auth/login/login.component.scss`

- [ ] **Step 1: Replace the stylesheet**

Replace the entire contents of `src/components/auth/login/login.component.scss` with:

```scss
// ─── Design tokens (scoped to this component) ─────────────────────────────────
:host {
  --bg:           #08080A;
  --surface:      #0E0E12;
  --raised:       #141418;
  --hover:        #17171C;
  --accent:       #7B2FBE;
  --accent-dim:   rgba(123,47,190,0.12);
  --accent-bdr:   rgba(123,47,190,0.3);
  --accent-hover: #9D4EDD;
  --border:       rgba(255,255,255,0.05);
  --border-mid:   rgba(255,255,255,0.09);
  --border-hi:    rgba(255,255,255,0.14);
  --text:         #EEEEF2;
  --muted:        #52525F;
  --mid:          #8585A0;
  --negative:     #E8524A;
  --negative-dim: rgba(232,82,74,0.10);
  --negative-bdr: rgba(232,82,74,0.18);
  --easing:       200ms ease-out;

  display: block;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--text);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

// ─── Shell ────────────────────────────────────────────────────────────────────
.auth-shell {
  display: flex;
  width: 100%;
  height: 100vh;
}

// ─── Left panel ───────────────────────────────────────────────────────────────
.auth-left {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 48px;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.auth-left-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 40% 60%, rgba(123,47,190,0.13) 0%, transparent 70%);
}

.orb {
  position: absolute;
  width: 380px;
  height: 380px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -56%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123,47,190,0.18) 0%, rgba(123,47,190,0.06) 40%, transparent 70%);
  pointer-events: none;
}

.chart-preview {
  position: absolute;
  inset: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-card {
  width: 100%;
  max-width: 380px;
  background: rgba(14,14,18,0.7);
  border: 1px solid var(--border-mid);
  border-radius: 16px;
  padding: 28px;
  backdrop-filter: blur(20px);
}

.cc-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
}

.cc-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 28px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  margin-bottom: 4px;
}

.cc-change {
  font-size: 13px;
  color: #27C97A;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}

.cc-chart {
  width: 100%;
  height: 80px;
}

.cc-holdings {
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.cc-holding {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.ch-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ch-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ch-name {
  font-size: 12.5px;
  color: var(--mid);
  letter-spacing: -0.01em;
}

.ch-right {
  display: flex;
  align-items: center;
}

.ch-val {
  font-family: 'Roboto Mono', monospace;
  font-size: 12.5px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.ch-pct {
  font-size: 11.5px;
  color: #27C97A;
  letter-spacing: -0.01em;
  margin-left: 8px;

  &.neg { color: #E8524A; }
}

.auth-left-copy {
  position: relative;
  z-index: 1;
}

.alc-tagline {
  font-size: 22px;
  font-weight: 300;
  color: var(--text);
  letter-spacing: -0.03em;
  line-height: 1.3;
  max-width: 300px;
}

.alc-sub {
  font-size: 13px;
  color: var(--muted);
  margin-top: 10px;
  line-height: 1.5;
  max-width: 280px;
  letter-spacing: -0.005em;
}

// ─── Right panel ──────────────────────────────────────────────────────────────
.auth-right {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 44px;
  overflow-y: auto;
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;
}

.logo-mark {
  width: 28px;
  height: 28px;
}

.logo-word {
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text);
}

.auth-heading {
  font-size: 22px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: -0.03em;
  margin-bottom: 6px;
}

.auth-subhead {
  font-size: 13px;
  color: var(--muted);
  letter-spacing: -0.005em;
  line-height: 1.5;
  margin-bottom: 32px;
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────
.mode-toggle {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  margin-bottom: 28px;
}

.mode-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 7px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 450;
  cursor: pointer;
  transition: color var(--easing), background var(--easing);
  outline: none;
  letter-spacing: -0.01em;
  background: transparent;
  color: var(--muted);

  &:not(.active):hover { color: var(--mid); }

  &.active {
    background: var(--raised);
    color: var(--text);
    font-weight: 500;
  }
}

// ─── Error banner ─────────────────────────────────────────────────────────────
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--negative-dim);
  border: 1px solid var(--negative-bdr);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--negative);
  line-height: 1.4;
  letter-spacing: -0.005em;
  margin-bottom: 16px;
}

// ─── Form ─────────────────────────────────────────────────────────────────────
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.f-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.f-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.f-input {
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 12px;
  height: 42px;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  color: var(--text);
  outline: none;
  transition: border-color var(--easing), background var(--easing);
  letter-spacing: -0.01em;
  width: 100%;

  &::placeholder { color: var(--muted); }
  &:focus { border-color: var(--accent-bdr); background: var(--surface); }
  &.error { border-color: var(--negative-bdr); }
}

.f-err {
  font-size: 11.5px;
  color: var(--negative);
  letter-spacing: -0.005em;
}

.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -6px;
}

.forgot-link {
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  transition: color var(--easing);
  letter-spacing: -0.005em;
  text-decoration: none;

  &:hover { color: var(--mid); }
}

// ─── Submit button ────────────────────────────────────────────────────────────
.auth-submit {
  width: 100%;
  height: 44px;
  background: var(--accent);
  border: none;
  border-radius: 9px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  transition: background var(--easing), transform 80ms ease-out;
  outline: none;
  letter-spacing: -0.01em;
  margin-top: 6px;
  position: relative;

  &:hover:not(:disabled) { background: var(--accent-hover); }
  &:active:not(:disabled) { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  &.loading {
    .submit-text { opacity: 0; }
    .submit-spinner { display: block; }
  }
}

.submit-text {
  transition: opacity 150ms ease-out;
}

.submit-spinner {
  display: none;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -8px 0 0 -8px;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

// ─── Divider ──────────────────────────────────────────────────────────────────
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 0;
}

.div-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.div-text {
  font-size: 11.5px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

// ─── Google button ────────────────────────────────────────────────────────────
.google-btn {
  width: 100%;
  height: 42px;
  background: transparent;
  border: 1px solid var(--border-mid);
  border-radius: 9px;
  font-family: 'Inter', sans-serif;
  font-size: 13.5px;
  font-weight: 450;
  color: var(--mid);
  cursor: pointer;
  transition: background var(--easing), color var(--easing), border-color var(--easing);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
  outline: none;
  letter-spacing: -0.01em;

  &:hover {
    background: var(--hover);
    color: var(--text);
    border-color: var(--border-hi);
  }
}

// ─── Terms ────────────────────────────────────────────────────────────────────
.auth-terms {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  line-height: 1.6;
  margin-top: 20px;
  letter-spacing: -0.005em;

  a {
    color: var(--mid);
    text-decoration: none;
    &:hover { color: var(--text); }
  }
}

// ─── Mobile ───────────────────────────────────────────────────────────────────
@media (max-width: 768px) {
  .auth-left { display: none; }
  .auth-right { width: 100%; padding: 36px 24px; }
}
```

- [ ] **Step 2: Verify the app compiles and starts**

```bash
npx ng build --configuration=development 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/login/login.component.scss
git commit -m "feat(auth): apply SPEC-003-12 dark split-screen styles to login"
```

---

## Task 5: Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
npx ng serve
```

Open `http://localhost:4200/login` in a browser.

- [ ] **Step 2: Check login mode against the prototype**

Open `prototypes/SPEC-003-12-login.html` side-by-side. Verify:
- Left decorative panel visible on desktop (chart card, orb glow, tagline)
- Right panel: Babylon orb logo mark + wordmark, "Welcome back" heading, mode toggle, email + password fields, forgot password link, Sign in button, "or" divider, Google button, terms line
- Error banner hidden when no error
- Left panel hidden on viewport ≤768px; right panel takes full width

- [ ] **Step 3: Check register mode**

Click "Create account" in the mode toggle. Verify:
- Heading switches to "Create account"
- Form shows: Full name · Username · Email · Password · Confirm password (in that order)
- Forgot password link hidden
- Submit button label reads "Create account"

- [ ] **Step 4: Check validation**

Submit empty login form. Verify field borders turn red and error messages appear below each field.

Submit register form with mismatched passwords. Verify confirm password field turns red with "Passwords do not match."

- [ ] **Step 5: Run all tests one final time**

```bash
npx ng test --watch=false
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(auth): login/register redesign — SPEC-003-12 complete"
```
