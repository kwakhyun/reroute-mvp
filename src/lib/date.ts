import { SEOUL_TIME_ZONE } from "./domain-constraints";

const seoulDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toSeoulDateKey(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid date value");
  const parts = seoulDateFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function fromSeoulDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Invalid date key");
  const date = new Date(`${value}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime()) || toSeoulDateKey(date) !== value) {
    throw new TypeError("Invalid date key");
  }
  return date;
}
