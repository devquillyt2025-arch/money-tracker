import { createAuthClient } from '@neon/auth';

// Neon Auth (managed Better Auth). The URL is the project's Auth Base URL from
// the Neon Console; the server verifies tokens against the same URL.
export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);

// Short-lived JWT for calling our own API. Neon Auth attaches it to the cached
// session and refreshes it before it expires.
export const getAuthToken = async (): Promise<string | null> => {
  const { data } = await authClient.getSession();
  return data?.session?.token ?? null;
};
