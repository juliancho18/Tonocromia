export const MAX_TOTAL_DURATION_MS = 10 * 60 * 1000;

export function wouldExceedLimit(activeDurationsMs: number[], candidateMs: number): boolean {
  const currentTotal = activeDurationsMs.reduce((sum, d) => sum + d, 0);
  return currentTotal + candidateMs > MAX_TOTAL_DURATION_MS;
}
