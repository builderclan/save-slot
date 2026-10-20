import { apiClient } from "@/lib/api-client";
import type { AuthSession } from "@/lib/auth";
import type { LoginInput, ForgotPasswordInput, ResetPasswordInput } from "@/lib/validations";

export interface ResetPasswordConfirmPayload extends ResetPasswordInput {
  code?: string;
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email?: string;
    fullName?: string;
    role: string;
  };
  redirectUrl: string;
}

export const authApi = {
  getMe(): Promise<{ authenticated?: boolean; user: AuthSession | null }> {
    return apiClient.get<{ authenticated?: boolean; user: AuthSession | null }>("/api/auth/me");
  },

  login(credentials: LoginInput): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/api/auth/login", credentials);
  },

  logout(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/api/auth/logout");
  },

  requestPasswordReset(payload: ForgotPasswordInput): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/api/auth/reset-password/request", payload);
  },

  confirmPasswordReset(payload: ResetPasswordConfirmPayload): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/api/auth/reset-password/confirm", payload);
  },
};
