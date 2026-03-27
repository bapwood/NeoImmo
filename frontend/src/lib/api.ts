import { clearStoredSession } from './auth';
import type { AuthSession } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type ApiErrorCode = 'AUTH_EXPIRED' | 'FORBIDDEN' | 'REQUEST_FAILED';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ApiErrorCode,
  ) {
    super(message);
  }
}

function normalizeErrorMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload !== 'object' || payload === null) {
    return fallbackMessage;
  }

  const candidate = payload as {
    error?: string;
    message?: string | string[];
  };

  if (Array.isArray(candidate.message)) {
    return candidate.message.join(', ');
  }

  if (typeof candidate.message === 'string') {
    return candidate.message;
  }

  if (typeof candidate.error === 'string') {
    return candidate.error;
  }

  return fallbackMessage;
}

export function resolveAssetUrl(assetPath: string | null | undefined) {
  if (!assetPath) {
    return '';
  }

  if (
    assetPath.startsWith('http://') ||
    assetPath.startsWith('https://') ||
    assetPath.startsWith('data:') ||
    assetPath.startsWith('blob:')
  ) {
    return assetPath;
  }

  if (assetPath.startsWith('/')) {
    return `${API_URL}${assetPath}`;
  }

  return assetPath;
}

export async function requestJson<T>(
  endpoint: string,
  init?: RequestInit,
  session?: AuthSession | null,
): Promise<T> {
  const headers = new Headers(init?.headers);
  const isFormDataPayload =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (!isFormDataPayload && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const fallbackMessage = `Requête en échec (${response.status})`;
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const message = normalizeErrorMessage(payload, fallbackMessage);

    if (response.status === 401) {
      clearStoredSession();
      throw new ApiError(message, response.status, 'AUTH_EXPIRED');
    }

    if (response.status === 403) {
      throw new ApiError(message, response.status, 'FORBIDDEN');
    }

    throw new ApiError(message, response.status, 'REQUEST_FAILED');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
