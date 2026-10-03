import { monthKeyOf } from './format';

// Expansão de contas recorrentes (mensais).
// Cada regra gera no máximo uma instância por mês, no dia de startDate
// (ajustado para o último dia do mês quando o dia não existe, ex: 31 -> 28/fev).

// "2026-09" -> 30
function daysInMonth(monthKey) {
  const [y, m] = String(monthKey).split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function instanceDateFor(rule, monthKey) {
  const startDay = Number(String(rule.startDate).slice(8, 10)) || 1;
  const day = Math.min(startDay, daysInMonth(monthKey));
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

export function isRuleActiveInMonth(rule, monthKey) {
  if (!rule || !rule.startDate) return false;
  const startMonth = monthKeyOf(rule.startDate);
  if (monthKey < startMonth) return false;
  const date = instanceDateFor(rule, monthKey);
  // Comparação lexicográfica funciona para o formato yyyy-mm-dd.
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  return true;
}

// Instâncias geradas por uma lista de regras para um mês específico.
// Têm o formato de uma Transaction, com flags extras:
// { id: 'rec-<ruleId>-<monthKey>', recurringId, recurring: true, ... }
export function expandRecurrings(rules, monthKey) {
  return (rules || [])
    .filter((r) => isRuleActiveInMonth(r, monthKey))
    .map((r) => ({
      id: `rec-${r.id}-${monthKey}`,
      recurringId: r.id,
      type: r.type,
      amount: Number(r.amount) || 0,
      category: r.category,
      description: r.description,
      date: instanceDateFor(r, monthKey),
      recurring: true,
    }));
}

// Lista combinada de lançamentos manuais + instâncias recorrentes do mês,
// ordenada por data (mais recente primeiro).
export function getMonthTransactions(transactions, recurrings, monthKey) {
  const manual = (transactions || []).filter(
    (t) => monthKeyOf(t.date) === monthKey
  );
  const auto = expandRecurrings(recurrings, monthKey);
  return [...manual, ...auto].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
}

// Texto curto para exibir a regra, ex: "Todo dia 10 • até 10/12/2026"
export function ruleSummary(rule) {
  const day = Number(String(rule.startDate).slice(8, 10)) || 1;
  let end = 'sem data final';
  if (rule.endDate) {
    const [y, m, d] = String(rule.endDate).split('-');
    end = `até ${d}/${m}/${y}`;
  }
  return `Todo dia ${day} • ${end}`;
}
