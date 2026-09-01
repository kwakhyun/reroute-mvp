export const LOGIN_FAILURE_LIMIT = 5;

export function isLoginRateLimited(recentFailureCount: number) {
  return recentFailureCount >= LOGIN_FAILURE_LIMIT;
}
