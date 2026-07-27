import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combineert en dedupliceert Tailwind-classnames.
 * Standaard shadcn/ui-patroon, gedeeld tussen apps/web en apps/admin
 * zodat beide exact dezelfde componentbibliotheek (packages/ui) kunnen gebruiken.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
