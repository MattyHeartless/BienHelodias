import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppRole } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { DeliverySessionService } from '../core/delivery-session.service';
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
  private readonly session = inject(DeliverySessionService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['delivery@bienhelodias.local', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required]]
  });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.authApi.login(this.form.getRawValue().email, this.form.getRawValue().password).subscribe({
      next: (response) => {
        this.session.setSession(response.data);
        if (response.data.role !== AppRole.DeliveryUser) {
          this.error.set('Esta aplicacion solo admite usuarios de reparto.');
          this.session.clear();
          this.submitting.set(false);
          return;
        }

        this.submitting.set(false);
        void this.router.navigate(['/panel']);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible iniciar sesion.'));
        this.submitting.set(false);
      }
    });
  }
}
