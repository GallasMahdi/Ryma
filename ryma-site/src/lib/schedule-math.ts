import type { SchedulingConfiguration } from '@/types/scheduling';

export function workingIntervals(state: SchedulingConfiguration, scope: string, date: string): [number, number][] {
  const exceptions = state.exceptions.filter(e => e.practitionerId === scope && e.date === date);
  const replacement = exceptions.filter(e => e.kind === 'open');
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
  let intervals: [number, number][] = (replacement.length ? replacement : state.hours.filter(h => h.practitionerId === scope && h.dayOfWeek === weekday)).map(h => [h.startMinute,h.endMinute]);
  intervals.sort((a,b) => a[0]-b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const last = merged.at(-1);
    if (last && interval[0] <= last[1]) last[1] = Math.max(last[1],interval[1]);
    else merged.push([...interval]);
  }
  intervals = merged;
  for (const block of exceptions.filter(e => e.kind === 'closed')) {
    intervals = intervals.flatMap(([s,e]): [number,number][] => e <= block.startMinute || s >= block.endMinute ? [[s,e]] : [
      ...(s < block.startMinute ? [[s,block.startMinute] as [number,number]] : []),
      ...(e > block.endMinute ? [[block.endMinute,e] as [number,number]] : []),
    ]);
  }
  return intervals;
}

export function practitionerIntervals(state: SchedulingConfiguration, practitionerId: string, date: string): [number,number][] {
  return workingIntervals(state,'*',date).flatMap(([cs,ce]) => workingIntervals(state,practitionerId,date).flatMap(([ps,pe]) => Math.max(cs,ps) < Math.min(ce,pe) ? [[Math.max(cs,ps),Math.min(ce,pe)] as [number,number]] : []));
}
