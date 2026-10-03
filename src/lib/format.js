// Formatação de moeda, datas e ids.
// Datas são guardadas como texto local "yyyy-mm-dd" para evitar
// problemas de fuso horário.

export function fmtBRL(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

// "1.234,56" -> 1234.56
export function parseBRL(text) {
  if (!text) return 0;
  const normalized = String(text)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function toDateKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

// "2026-09-26" -> "2026-09"
export function monthKeyOf(dateKey) {
  return String(dateKey).slice(0, 7);
}

export function currentMonthKey() {
  return monthKeyOf(todayKey());
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = String(monthKey).split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return monthKeyOf(toDateKey(dt));
}

export function monthLabel(monthKey) {
  const [y, m] = String(monthKey).split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "2026-09-26" -> "26/09"
export function fmtDateKey(dateKey) {
  const parts = String(dateKey).split('-');
  if (parts.length < 3) return String(dateKey);
  return `${parts[2]}/${parts[1]}`;
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
