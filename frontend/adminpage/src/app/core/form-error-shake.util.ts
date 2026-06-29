type ShakeControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type RevertElement = HTMLElement & { __errorShakeRevertTimer?: number };

const INVALID_CONTROL_SELECTOR = [
  'input[formControlName].ng-invalid:not([type="checkbox"])',
  'textarea[formControlName].ng-invalid',
  'select[formControlName].ng-invalid'
].join(',');

export function shakeInvalidFormControls(root: HTMLElement, scopeSelector?: string): void {
  window.requestAnimationFrame(() => {
    const scope = scopeSelector ? root.querySelector<HTMLElement>(scopeSelector) : root;
    if (!scope) {
      return;
    }

    const controls = Array.from(scope.querySelectorAll<ShakeControl>(INVALID_CONTROL_SELECTOR));
    controls.forEach((control) => showFieldError(control, getControlErrorMessage(control)));
    controls[0]?.focus({ preventScroll: true });
    controls[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

export function shakeFieldBySelector(root: HTMLElement, selector: string, message = 'Completa este campo.'): void {
  window.requestAnimationFrame(() => {
    const control = root.querySelector<ShakeControl>(selector);
    if (!control) {
      return;
    }

    showFieldError(control, message);
    control.focus({ preventScroll: true });
    control.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function showFieldError(control: ShakeControl, message: string): void {
  const fieldBlock = control.closest<HTMLElement>('.field-block');
  const inputSurface = control;
  const wrap = fieldBlock as RevertElement | null;
  const revertTarget = (wrap ?? inputSurface) as RevertElement;
  const errorMessage = getOrCreateErrorMessage(control, fieldBlock);
  const shakeMs = getShakeDurationMs();

  inputSurface.classList.add('t-input', 'is-error');
  wrap?.classList.add('t-input-wrap', 'is-error');
  errorMessage.textContent = message;

  inputSurface.classList.remove('is-shaking');
  void inputSurface.offsetWidth;
  inputSurface.classList.add('is-shaking');

  window.setTimeout(() => inputSurface.classList.remove('is-shaking'), shakeMs + 20);

  if (revertTarget.__errorShakeRevertTimer) {
    window.clearTimeout(revertTarget.__errorShakeRevertTimer);
  }

  revertTarget.__errorShakeRevertTimer = window.setTimeout(() => {
    revertTarget.__errorShakeRevertTimer = undefined;
    wrap?.classList.remove('is-error');
    inputSurface.classList.remove('is-error');
  }, shakeMs + getRevertHoldMs());

  bindClearOnInput(control, wrap, inputSurface, revertTarget);
}

function getOrCreateErrorMessage(control: ShakeControl, fieldBlock: HTMLElement | null): HTMLElement {
  const existing = fieldBlock
    ? Array.from(fieldBlock.children).find((child) => child instanceof HTMLElement && child.dataset['errorShake'] === 'true') as HTMLElement | undefined
    : control.nextElementSibling instanceof HTMLElement && control.nextElementSibling.dataset['errorShake'] === 'true'
      ? control.nextElementSibling
      : undefined;

  if (existing) {
    return existing;
  }

  const message = document.createElement('p');
  message.className = 't-error-msg field-error-shake-message';
  message.dataset['errorShake'] = 'true';

  if (fieldBlock) {
    fieldBlock.appendChild(message);
  } else {
    control.insertAdjacentElement('afterend', message);
  }

  return message;
}

function bindClearOnInput(
  control: ShakeControl,
  wrap: HTMLElement | null,
  inputSurface: HTMLElement,
  revertTarget: RevertElement
): void {
  if (control.dataset['errorShakeBound'] === 'true') {
    return;
  }

  control.dataset['errorShakeBound'] = 'true';
  control.addEventListener('input', () => {
    if (revertTarget.__errorShakeRevertTimer) {
      window.clearTimeout(revertTarget.__errorShakeRevertTimer);
      revertTarget.__errorShakeRevertTimer = undefined;
    }

    wrap?.classList.remove('is-error');
    inputSurface.classList.remove('is-error');
  });
}

function getControlErrorMessage(control: ShakeControl): string {
  if (control instanceof HTMLInputElement && control.type === 'email') {
    return 'Captura un correo valido.';
  }

  if (control instanceof HTMLInputElement && control.type === 'number') {
    return 'Captura un valor valido.';
  }

  return 'Completa este campo.';
}

function getShakeDurationMs(): number {
  return getCssDurationMs('--shake-dur-a', 80) * 2 + getCssDurationMs('--shake-dur-b', 60) * 2;
}

function getRevertHoldMs(): number {
  return getCssDurationMs('--revert-hold', 3000);
}

function getCssDurationMs(name: string, fallback: number): number {
  const rawValue = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const numericValue = Number.parseFloat(rawValue);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return rawValue.endsWith('s') && !rawValue.endsWith('ms')
    ? numericValue * 1000
    : numericValue;
}
