// Simple className utility without external dependencies
export type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}