import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  user = this.authService.currentUser;
  
  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
  });

  passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, {
    validators: (group) => {
      const pass = group.get('password')?.value;
      const confirm = group.get('confirmPassword')?.value;
      return pass === confirm ? null : { mismatch: true };
    }
  });

  isLoading = signal(false);

  ngOnInit() {
    const currentUser = this.user();
    if (currentUser) {
      this.profileForm.patchValue({
        firstName: currentUser.firstName || currentUser.name.split(' ')[0],
        lastName: currentUser.lastName || currentUser.name.split(' ').slice(1).join(' '),
        email: currentUser.email
      });
    }
  }

  async updateProfile() {
    if (this.profileForm.valid) {
      this.isLoading.set(true);
      try {
        const data = this.profileForm.getRawValue() as any;
        await this.authService.updateProfile(data);
        toast.success('Profile updated successfully');
      } catch (error) {
        toast.error('Failed to update profile');
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  async updatePassword() {
    if (this.passwordForm.valid) {
      this.isLoading.set(true);
      try {
        await this.authService.setPassword(this.passwordForm.value.password!);
        this.passwordForm.reset();
        toast.success('Password set successfully');
      } catch (error) {
        toast.error('Failed to set password');
      } finally {
        this.isLoading.set(false);
      }
    }
  }
}
