import { Alert } from '@mantine/core';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from '@/lib/api.ts';

/**
 * Maps RFC 9457 field errors onto react-hook-form fields and returns the message to show
 * for everything that is not field-specific.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (error instanceof ApiError && error.problem?.errors?.length) {
    let general: string | null = null;
    for (const fieldError of error.problem.errors) {
      const path = fieldError.path.split('.')[0] as Path<T>;
      if (fields.includes(path)) setError(path, { type: 'server', message: fieldError.message });
      else general = fieldError.message;
    }
    return general;
  }
  return errorMessage(error);
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert color="red" variant="light" role="alert">
      {message}
    </Alert>
  );
}
