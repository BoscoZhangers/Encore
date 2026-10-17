export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const form = options.body instanceof FormData;
  const response = await fetch('/api' + url, {
    ...options,
    cache: options.cache ?? 'no-store',
    credentials: 'same-origin',
    headers: {
      'X-Encore-Client': 'web',
      ...(!form && options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({ error: 'The server could not be reached' }));
  if (!response.ok) throw new ApiError(response.status, data.error || 'Request failed');
  return data;
}
export const post = (url: string, body: any = {}) =>
  api(url, { method: 'POST', body: JSON.stringify(body) });
export const cad = (cents: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
