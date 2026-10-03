import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import {
  fmtBRL,
  currentMonthKey,
  shiftMonth,
  monthLabel,
  fmtDateKey,
} from '../../lib/format';
import { getTransactions, getLoans, getBudget, getRecurrings } from '../../lib/storage';
import { getMonthTransactions } from '../../lib/recurring';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import { Card, SectionTitle, ProgressBar, Empty } from '../../components/ui';

function MonthNav({ month, onChange }) {
  return (
    <View style={styles.monthNav}>
      <Pressable onPress={() => onChange(shiftMonth(month, -1))} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
      <Pressable onPress={() => onChange(shiftMonth(month, 1))} hitSlop={12}>
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const [month, setMonth] = useState(currentMonthKey());
  const [transactions, setTransactions] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [loans, setLoans] = useState([]);
  const [budget, setBudget] = useState({ monthlyLimit: 0, categoryLimits: {} });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setTransactions(await getTransactions());
        setRecurrings(await getRecurrings());
        setLoans(await getLoans());
        setBudget(await getBudget());
      })();
    }, [])
  );

  const monthTx = getMonthTransactions(transactions, recurrings, month);
  const income = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const unpaid = loans.filter((l) => !l.paid);
  const toReceive = unpaid.reduce((s, l) => s + l.amount, 0);
  const peopleCount = new Set(unpaid.map((l) => l.person)).size;

  const recent = [...monthTx]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);

  const limit = Number(budget.monthlyLimit) || 0;
  const pct = limit > 0 ? expense / limit : 0;

  const spentByCat = {};
  monthTx.forEach((t) => {
    if (t.type === 'expense') {
      spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
    }
  });
  const catsWithLimit = EXPENSE_CATEGORIES.filter(
    (c) => Number(budget.categoryLimits?.[c]) > 0
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Meu Bolso</Text>
        <MonthNav month={month} onChange={setMonth} />

        <View style={styles.statsRow}>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Receitas</Text>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {fmtBRL(income)}
            </Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Despesas</Text>
            <Text style={[styles.statValue, { color: colors.expense }]}>
              {fmtBRL(expense)}
            </Text>
          </Card>
        </View>

        <Card>
          <Text style={styles.statLabel}>Saldo do mês</Text>
          <Text
            style={[
              styles.balance,
              { color: balance >= 0 ? colors.income : colors.expense },
            ]}
          >
            {fmtBRL(balance)}
          </Text>
        </Card>

        {limit > 0 && (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Teto mensal</Text>
              <Text style={styles.muted}>{Math.round(pct * 100)}%</Text>
            </View>
            <ProgressBar value={expense} max={limit} />
            <Text style={styles.mutedSmall}>
              {fmtBRL(expense)} de {fmtBRL(limit)}
            </Text>
            {pct >= 1 ? (
              <Text style={[styles.alert, { color: colors.expense }]}>
                Você atingiu o teto mensal!
              </Text>
            ) : pct >= 0.8 ? (
              <Text style={[styles.alert, { color: colors.warning }]}>
                Atenção: 80% do teto já foi usado.
              </Text>
            ) : null}
          </Card>
        )}

        {catsWithLimit.length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Tetos por categoria</Text>
            {catsWithLimit.map((c) => {
              const catLimit = Number(budget.categoryLimits[c]);
              const spent = spentByCat[c] || 0;
              const catPct = catLimit > 0 ? spent / catLimit : 0;
              return (
                <View key={c} style={styles.catBudgetRow}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.catBudgetName}>{c}</Text>
                    <Text style={styles.muted}>{Math.round(catPct * 100)}%</Text>
                  </View>
                  <ProgressBar value={spent} max={catLimit} height={8} />
                  <Text style={styles.mutedSmall}>
                    {fmtBRL(spent)} de {fmtBRL(catLimit)}
                  </Text>
                  {catPct >= 1 ? (
                    <Text style={[styles.alert, { color: colors.expense }]}>
                      Teto de {c} atingido!
                    </Text>
                  ) : catPct >= 0.8 ? (
                    <Text style={[styles.alert, { color: colors.warning }]}>
                      Atenção: 80% do teto de {c} já foi usado.
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>Gastos por categoria</Text>
          {expense === 0 ? (
            <Text style={styles.mutedSmall}>Sem despesas neste mês.</Text>
          ) : (
            Object.entries(spentByCat)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([cat, value]) => {
                const pct = value / expense;
                return (
                  <View key={cat} style={styles.chartRow}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.catBudgetName} numberOfLines={1}>
                        {cat}
                      </Text>
                      <Text style={styles.muted}>
                        {fmtBRL(value)} • {Math.round(pct * 100)}%
                      </Text>
                    </View>
                    <View style={styles.chartTrack}>
                      <View
                        style={[
                          styles.chartFill,
                          { width: `${Math.max(pct * 100, 3)}%` },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
          )}
        </Card>

        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>A receber</Text>
            <Ionicons name="people-outline" size={20} color={colors.muted} />
          </View>
          <Text style={[styles.balance, { color: colors.primary }]}>
            {fmtBRL(toReceive)}
          </Text>
          <Text style={styles.mutedSmall}>
            {peopleCount === 0
              ? 'Ninguém te devendo. Tudo certo!'
              : `${peopleCount} ${peopleCount === 1 ? 'pessoa te devendo' : 'pessoas te devendo'}`}
          </Text>
        </Card>

        <SectionTitle>Últimos lançamentos</SectionTitle>
        {recent.length === 0 ? (
          <Empty text="Nenhum lançamento neste mês." />
        ) : (
          recent.map((t) => (
            <Card key={t.id} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{t.description || t.category}</Text>
                <Text style={styles.mutedSmall}>
                  {t.category} • {fmtDateKey(t.date)}
                </Text>
              </View>
              <Text
                style={[
                  styles.txValue,
                  { color: t.type === 'income' ? colors.income : colors.expense },
                ]}
              >
                {t.type === 'income' ? '+' : '-'}
                {fmtBRL(t.amount)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  statValue: { fontSize: 19, fontWeight: '800' },
  balance: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 6 },
  alert: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  catBudgetRow: { marginTop: 12 },
  catBudgetName: { fontSize: 15, fontWeight: '600', color: colors.text },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  txDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  txValue: { fontSize: 16, fontWeight: '800' },
  chartRow: { marginTop: 12 },
  chartTrack: {
    backgroundColor: '#EDEDED',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 6,
    height: 10,
  },
  chartFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
});
