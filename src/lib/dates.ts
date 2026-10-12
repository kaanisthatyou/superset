const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saate göre YYYY-AA-GG */
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** 1 = Pazartesi … 7 = Pazar */
export const weekdayOf = (s: string) => ((parse(s).getDay() + 6) % 7) + 1;
export const mondayOf = (s: string) => addDays(s, 1 - weekdayOf(s));

export const isoWeek = (s: string) => {
  const d = parse(s);
  d.setDate(d.getDate() + 4 - weekdayOf(s));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const fmtDay = (s: string) => {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const fmtRange = (start: string, end: string) => {
  const a = parse(start);
  const b = parse(end);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${fmtDay(start)} – ${fmtDay(end)}`;
};

export const fmtClock = (totalSec: number) => {
  const s = Math.max(0, Math.ceil(totalSec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

export const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
