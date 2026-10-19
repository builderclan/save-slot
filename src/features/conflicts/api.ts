import { apiClient } from "@/lib/api-client";
import type { ConflictCheckResult } from "@/types/database";
import type { ConflictCheckInput } from "@/lib/validations";

export const conflictsApi = {
  check(payload: ConflictCheckInput): Promise<ConflictCheckResult> {
    return apiClient.post<ConflictCheckResult>("/api/conflicts/check", payload);
  },
};
