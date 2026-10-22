/** Prices for credits. Shared by the server and the pages that show them. */
export const FREE_CREDITS = 10;
export const CREDITS_PER_APPLICATION = 2;
export const RUPEES_PER_CREDIT = 1;
export const CREDIT_PACKS = [20, 50, 100, 500] as const;

/** How many applications a balance pays for. */
export function applicationsFor(credits: number) {
  return Math.floor(Math.max(0, credits) / CREDITS_PER_APPLICATION);
}

export function rupees(credits: number) {
  return `₹${(credits * RUPEES_PER_CREDIT).toLocaleString("en-IN")}`;
}
