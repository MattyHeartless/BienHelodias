export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const maybeError = error as {
    error?: { message?: string; errors?: string[] };
    message?: string;
  };

  if (maybeError.error?.errors?.length) {
    return maybeError.error.errors[0];
  }

  return maybeError.error?.message ?? maybeError.message ?? fallback;
}
