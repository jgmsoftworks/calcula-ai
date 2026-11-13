/** Read text fields from SDK errors without assuming every thrown value is an Error. */
export function errorString(error: unknown, field: string): string | undefined {
  if (typeof error !== 'object' || error === null || !(field in error)) return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

export function errorMessage(error: unknown): string | undefined {
  return errorString(error, 'message');
}
