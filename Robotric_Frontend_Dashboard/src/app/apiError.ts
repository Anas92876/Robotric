/** The backend's error shape: { error: { message, code, statusCode } } (older routes: { message }). */
export interface ApiError {
  status?: number;
  code?: string;
  message: string;
}

/** Reads an axios error into { status, code, message } so pages can show a clear, translated message. */
export function readApiError(err: unknown, fallback = 'Something went wrong'): ApiError {
  const e = err as { response?: { status?: number; data?: { error?: { message?: string; code?: string }; message?: string; code?: string } }; message?: string };
  const data = e?.response?.data;
  return {
    status: e?.response?.status,
    code: data?.error?.code ?? data?.code,
    message: data?.error?.message ?? data?.message ?? e?.message ?? fallback,
  };
}
