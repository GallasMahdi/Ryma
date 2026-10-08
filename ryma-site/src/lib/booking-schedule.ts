export function clockMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function overlaps(time: string, duration: number, otherTime: string, otherDuration: number): boolean {
  const start = clockMinutes(time), other = clockMinutes(otherTime);
  return start < other + otherDuration && other < start + duration;
}
