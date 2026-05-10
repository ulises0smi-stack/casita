import type { UserDTO, TokenPair } from "@casita/shared";
import { ApiClient, type ApiClientOptions } from "./client.js";

export type RegisterInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
};

export type AuthResponse = {
  user: UserDTO;
  tokens: TokenPair;
};

export class AuthClient {
  constructor(private client: ApiClient) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    return this.client.post<AuthResponse, RegisterInput>("/api/auth/register", input);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    return this.client.post<AuthResponse, LoginInput>("/api/auth/login", input);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.client.post<TokenPair, { refreshToken: string }>("/api/auth/refresh", { refreshToken });
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    return this.client.post<{ success: boolean }, { refreshToken: string }>("/api/auth/logout", { refreshToken });
  }

  async me(): Promise<UserDTO> {
    return this.client.get<UserDTO>("/api/auth/me");
  }

  async getSessions(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/api/auth/sessions");
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    return this.client.delete<{ success: boolean }>(`/api/auth/sessions/${sessionId}`);
  }
}

export function createAuthClient(options: ApiClientOptions): AuthClient {
  return new AuthClient(new ApiClient(options));
}