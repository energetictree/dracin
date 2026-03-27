// Authentication configuration
// Password can be set via VITE_ACCESS_PASSWORD environment variable
// Default is 'dracin123' if not set

export const AUTH_CONFIG = {
  PASSWORD: import.meta.env.VITE_ACCESS_PASSWORD || 'dracin123',
  SESSION_DURATION_DAYS: 7,
  STORAGE_KEY: 'dracin_session',
} as const;

export interface UserSession {
  username: string;
  loginTime: number;
  expiresAt: number;
}

export function createSession(username: string): UserSession {
  const now = Date.now();
  const expiresAt = now + (AUTH_CONFIG.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  
  return {
    username,
    loginTime: now,
    expiresAt,
  };
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): UserSession | null {
  try {
    const data = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
    if (!data) return null;
    
    const session: UserSession = JSON.parse(data);
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
}

export function verifyPassword(input: string): boolean {
  return input === AUTH_CONFIG.PASSWORD;
}
