export interface UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface SessionDTO {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserDTO;
  tokens: TokenPair;
}