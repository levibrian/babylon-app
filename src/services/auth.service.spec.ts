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
