import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { LoginComponent, passwordMatchValidator } from './login.component';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';

describe('passwordMatchValidator (standalone)', () => {
  it('returns null when passwords match', () => {
    const group = new FormGroup({
      password: new FormControl('secret123'),
      confirmPassword: new FormControl('secret123'),
    });
    expect(passwordMatchValidator(group)).toBeNull();
  });

  it('returns passwordMismatch error when passwords differ', () => {
    const group = new FormGroup({
      password: new FormControl('secret123'),
      confirmPassword: new FormControl('different'),
    });
    expect(passwordMatchValidator(group)).toEqual({ passwordMismatch: true });
  });
});

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
        { provide: ActivatedRoute, useValue: { snapshot: { data: { mode: 'login' } } } },
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

    it('sets error signal on failure', async () => {
      authServiceSpy.signInWithGoogle.and.returnValue(Promise.reject('Google error'));
      component.onGoogleSignIn();
      await fixture.whenStable();
      expect(component.error()).toBe('Google sign-in failed. Please try again.');
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
