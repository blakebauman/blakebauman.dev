import { z } from 'zod';

export interface FormattedError {
  message: string;
  field?: string;
}

/**
 * Converts a ZodError into user-friendly error messages
 */
export function formatZodError(error: z.ZodError): FormattedError[] {
  return error.issues.map(issue => ({
    message: issue.message,
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
  }));
}

/**
 * Returns the first error message from a ZodError
 */
export function getFirstErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  return firstIssue?.message ?? 'Validation failed';
}

/**
 * Creates a 400 Response with validation error JSON
 */
export function createValidationErrorResponse(error: z.ZodError): Response {
  return new Response(JSON.stringify({ error: getFirstErrorMessage(error) }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
