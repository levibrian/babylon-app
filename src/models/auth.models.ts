// ─── Backend API Response Shape ────────────────────────────────────────────

/** Raw response from POST /auth/register, /auth/login, /auth/google, /auth/refresh */
export interface BackendAuthResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    userId: string;
    username: string;
    email: string;
    /** e.g. "Local", "Google", "Local,Google" */
    authProvider: string;
  };
}

// ─── Normalised Domain Models ───────────────────────────────────────────────

/** Normalised user kept in the UserStore and localStorage. */
export interface User {
  id: string;
  email: string;
  username: string;
  /** Derived from the backend's comma-separated authProvider string */
  authProviders: string[]; // e.g. ['Local'], ['Google'], ['Local', 'Google']
}

/** Canonical AuthResponse (as per the 6-Flow spec). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── Request Payloads ───────────────────────────────────────────────────────

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface GooglePayload {
  idToken: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}
