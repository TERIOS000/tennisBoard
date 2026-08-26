export const cleanupSchedule = "45 0 * * *";
export const cleanupBatchSize = 500;
const slotPathPattern = /^days\/(\d{4}-\d{2}-\d{2})\/slots\/[^/]+$/;

export function isStaleDay(dayId: string, todayId: string) {
  return dayId < todayId;
}

export function slotParentDay(slotPath: string): string | null {
  const match = slotPathPattern.exec(slotPath);
  return match ? match[1] : null;
}

export function chunk<T>(items: T[], size = cleanupBatchSize): T[][] {
  if (size < 1) throw new Error("Chunk size must be at least 1.");
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}
