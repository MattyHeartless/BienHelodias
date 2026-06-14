import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppRole } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { AdminSessionService } from '../core/admin-session.service';
import { NotificationUiService } from '../core/notification-ui.service';
import { AuthApiService } from '../services/auth-api.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly session = inject(AdminSessionService);
  private readonly notifications = inject(NotificationUiService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['admin@bienhelodias.local', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required]],
    rememberMe: [true]
  });

  constructor() {
    void this.redirectIfAuthenticated();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.authApi
      .login(this.form.getRawValue().email, this.form.getRawValue().password, this.form.getRawValue().rememberMe)
      .subscribe({
      next: (response) => {
        this.session.setSession(response.data);
        if (![AppRole.StoreAdmin, AppRole.SuperAdmin].includes(response.data.role)) {
          const message = 'Esta aplicacion solo admite StoreAdmin y SuperAdmin.';
          this.error.set(message);
          this.notifications.error({ summary: message });
          this.session.clear();
          this.submitting.set(false);
          return;
        }

        this.submitting.set(false);
        void this.router.navigate(['/dashboard/overview']);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible iniciar sesion.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.submitting.set(false);
      }
    });
  }

  private async redirectIfAuthenticated(): Promise<void> {
    if ((await this.session.ensureSession()) && [AppRole.StoreAdmin, AppRole.SuperAdmin].includes(this.session.role() ?? AppRole.Customer)) {
      await this.router.navigate(['/dashboard/overview']);
    }
  }
}
