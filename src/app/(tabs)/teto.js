import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import {
  fmtBRL,
  parseBRL,
  currentMonthKey,
} from '../../lib/format';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import {
  getTransactions,
  getBudget,
  saveBudget,
  getRecurrings,
  DEFAULT_BUDGET,
} from '../../lib/storage';
import { getMonthTransactions } from '../../lib/recurring';
import {
  Card,
  Input,
  Field,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
} from '../../components/ui';

export default function BudgetScreen() {
  const [budget, setBudget] = useState({ ...DEFAULT_BUDGET });
  const [transactions, setTransactions] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [limitText, setLimitText] = useState('');
  const [catTexts, setCatTexts] = useState({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const b = await getBudget();
        setBudget(b);
        setLimitText(b.monthlyLimit > 0 ? String(b.monthlyLimit).replace('.', ',') : '');
        const ct = {};
        EXPENSE_CATEGORIES.forEach((c) => {
          const v = Number(b.categoryLimits?.[c]) || 0;
          ct[c] = v > 0 ? String(v).replace('.', ',') : '';
        });
        setCatTexts(ct);
        setTransactions(await getTransactions());
        setRecurrings(await getRecurrings());
      })();
    }, [])
  );

  const month = currentMonthKey();
  const monthTx = getMonthTransactions(transactions, recurrings, month);
  const monthExpenses = monthTx.filter((t) => t.type === 'expense');
  const totalSpent = monthExpenses.reduce((s, t) => s + t.amount, 0);
  const spentByCat = {};
  monthExpenses.forEach((t) => {
    spentByCat[t.category] = (spentByCat[t.category] || 0) + t.amount;
  });

  const handleSave = async () => {
    const categoryLimits = {};
    EXPENSE_CATEGORIES.forEach((c) => {
      const v = parseBRL(catTexts[c]);
      if (v > 0) categoryLimits[c] = v;
    });
    const next = { monthlyLimit: parseBRL(limitText), categoryLimits };
    await saveBudget(next);
    setBudget(next);
    Alert.alert('Teto salvo', 'Seus limites foram atualizados.');
  };

  const limit = Number(budget.monthlyLimit) || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Teto mensal</Text>
        <Text style={styles.subtitle}>
          Defina quanto pode gastar em cada categoria. O app avisa quando você
          chegar a 80% e 100% do teto.
        </Text>

        <SectionTitle>Limite por categoria</SectionTitle>
        <Card>
          {EXPENSE_CATEGORIES.map((c) => {
            const spent = spentByCat[c] || 0;
            const catLimit = Number(budget.categoryLimits?.[c]) || 0;
            return (
              <View key={c} style={styles.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{c}</Text>
                  <Text style={styles.mutedSmall}>Gasto: {fmtBRL(spent)}</Text>
                  {catLimit > 0 && (
                    <ProgressBar value={spent} max={catLimit} height={6} />
                  )}
                </View>
                <Input
                  value={catTexts[c] ?? ''}
                  onChangeText={(v) => setCatTexts((p) => ({ ...p, [c]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="Teto"
                  style={styles.catInput}
                />
              </View>
            );
          })}
        </Card>

        <SectionTitle>Limite geral do mês (opcional)</SectionTitle>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Gasto no mês</Text>
            {limit > 0 && (
              <Text style={styles.muted}>
                {Math.round((totalSpent / limit) * 100)}%
              </Text>
            )}
          </View>
          {limit > 0 ? (
            <>
              <ProgressBar value={totalSpent} max={limit} />
              <Text style={styles.mutedSmall}>
                {fmtBRL(totalSpent)} de {fmtBRL(limit)}
              </Text>
            </>
          ) : (
            <Text style={styles.mutedSmall}>
              Se quiser, defina um teto geral para o mês além dos tetos por
              categoria.
            </Text>
          )}
          <View style={{ height: 12 }} />
          <Field label="Teto geral do mês (R$)">
            <Input
              value={limitText}
              onChangeText={setLimitText}
              keyboardType="decimal-pad"
              placeholder="Ex: 3.000,00"
            />
          </Field>
        </Card>

        <PrimaryButton title="Salvar limites" onPress={handleSave} />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muted: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 6 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catName: { fontSize: 15, fontWeight: '600', color: colors.text },
  catInput: { width: 110, textAlign: 'right' },
});
