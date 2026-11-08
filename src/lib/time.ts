// School-local time helpers. All schedule times are "HH:MM" in the school's timezone.

export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${get("hour")}:${get("minute")}`,
  };
}

export function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// The Date for a local date + time in a timezone, e.g. ("2026-11-09", "07:52", "Asia/Karachi")
export function zonedTime(dateKey: string, hhmm: string, timeZone: string) {
  const guess = new Date(`${dateKey}T${hhmm}:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")?.value; // "GMT+05:00"
  const match = offset?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return guess;
  const sign = match[1] === "+" ? 1 : -1;
  const minutes = sign * (Number(match[2]) * 60 + Number(match[3]));
  return new Date(guess.getTime() - minutes * 60_000);
}
