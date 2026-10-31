import { addDays, nowJakarta } from "./format";

/** The delivery date the owner is most likely working on: today before noon (dawn run), tomorrow after. */
export function operationalDate(): string {
  const n = nowJakarta();
  return n.hour < 12 ? n.date : addDays(n.date, 1);
}

export function pickDate(param?: string): string {
  return param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : operationalDate();
}
