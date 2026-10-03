import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../lib/theme';
import {
  fmtBRL,
  parseBRL,
  toDateKey,
  uid,
} from '../../lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import { getRecurrings, saveRecurrings } from '../../lib/storage';
import { ruleSummary } from '../../lib/recurring';
import {
  Card,
  Fab,
  Input,
  Field,
  PrimaryButton,
  ModalSheet,
  Empty,
} from '../../components/ui';

const EMPTY_FORM = {
  id: null,
  type: 'expense',
  amountText: '',
  category: EXPENSE_CATEGORIES[0],
  description: '',
  startDateObj: new Date(),
  noEndDate: true,
  endDateObj: new Date(),
};

export default function RecurringsScreen() {
  const [rules, setRules] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => setRules(await getRecurrings()))();
    }, [])
  );

  const categories =
    form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const set = (patch) => setForm((p) => ({ ...p, ...patch }));

  const openNew = () => {
    set({ ...EMPTY_FORM });
    setModalVisible(true);
  };

  const openEdit = (rule) => {
    set({
      id: rule.id,
      type: rule.type,
      amountText: String(Number(rule.amount) || '').replace('.', ','),
      category: rule.category,
      description: rule.description || '',
      startDateObj: new Date(`${rule.startDate}T12:00:00`),
      noEndDate: !rule.endDate,
      endDateObj: rule.endDate
        ? new Date(`${rule.endDate}T12:00:00`)
        : new Date(),
    });
    setModalVisible(true);
  };

  const handleTypeChange = (next) => {
    set({
      type: next,
      category:
        next === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
    });
  };

  const handleSave = async () => {
    const amount = parseBRL(form.amountText);
    if (!amount || amount <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    const startDate = toDateKey(form.startDateObj);
    let endDate = '';
    if (!form.noEndDate) {
      endDate = toDateKey(form.endDateObj);
      if (endDate < startDate) {
        Alert.alert(
          'Data inválida',
          'A data final precisa ser igual ou posterior à data de início.'
        );
        return;
      }
    }
    const rule = {
      id: form.id || uid(),
      type: form.type,
      amount,
      category: form.category,
      description: form.description.trim(),
      startDate,
      endDate,
      createdAt: Date.now(),
    };
    const next = form.id
      ? rules.map((r) => (r.id === form.id ? rule : r))
      : [rule, ...rules];
    await saveRecurrings(next);
    setRules(next);
    setModalVisible(false);
  };

  const handleDelete = (rule) => {
    Alert.alert(
      'Excluir conta recorrente',
      `Parar de repetir "${rule.description || rule.category}" de ${fmtBRL(
        rule.amount
      )}? As repetições somem de todos os meses, inclusive dos anteriores, porque são calculadas a partir desta regra.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const next = rules.filter((r) => r.id !== rule.id);
            await saveRecurrings(next);
            setRules(next);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Contas recorrentes</Text>
        <Text style={styles.subtitle}>
          Contas de valor fixo que se repetem todo mês até você remover ou até
          a data final.
        </Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {rules.length === 0 ? (
            <Empty text="Nenhuma conta recorrente. Toque em + para adicionar (ex: aluguel, internet, streaming)." />
          ) : (
            rules.map((r) => (
              <Card key={r.id} style={styles.ruleRow}>
                <View style={styles.ruleIcon}>
                  <Ionicons
                    name="repeat"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleDesc}>
                    {r.description || r.category}
                  </Text>
                  <Text style={styles.mutedSmall}>
                    {r.category} • {ruleSummary(r)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.ruleValue,
                    {
                      color:
                        r.type === 'income' ? colors.income : colors.expense,
                    },
                  ]}
                >
                  {r.type === 'income' ? '+' : '-'}
                  {fmtBRL(r.amount)}
                </Text>
                <Pressable onPress={() => openEdit(r)} hitSlop={10} style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={20} color={colors.muted} />
                </Pressable>
                <Pressable onPress={() => handleDelete(r)} hitSlop={10} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.muted} />
                </Pressable>
              </Card>
            ))
          )}
        </ScrollView>
        <Fab onPress={openNew} />

        <ModalSheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title={form.id ? 'Editar conta recorrente' : 'Nova conta recorrente'}
        >
          <ScrollView>
            <View style={styles.typeToggle}>
              <Pressable
                onPress={() => handleTypeChange('expense')}
                style={[
                  styles.typeOption,
                  form.type === 'expense' && { backgroundColor: colors.expense },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    form.type === 'expense' && { color: '#fff' },
                  ]}
                >
                  Despesa
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleTypeChange('income')}
                style={[
                  styles.typeOption,
                  form.type === 'income' && { backgroundColor: colors.income },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    form.type === 'income' && { color: '#fff' },
                  ]}
                >
                  Receita
                </Text>
              </Pressable>
            </View>

            <Field label="Valor fixo (R$)">
              <Input
                value={form.amountText}
                onChangeText={(v) => set({ amountText: v })}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
            </Field>

            <Field label="Categoria">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  {categories.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => set({ category: c })}
                      style={[
                        styles.chip,
                        form.category === c && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          form.category === c && { color: '#fff' },
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </Field>

            <Field label="Descrição (opcional)">
              <Input
                value={form.description}
                onChangeText={(v) => set({ description: v })}
                placeholder="Ex: aluguel"
              />
            </Field>

            <Field label="Começa em">
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={styles.dateButton}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={styles.dateText}>
                  {form.startDateObj.toLocaleDateString('pt-BR')}
                </Text>
              </Pressable>
            </Field>
            {showStartPicker && (
              <DateTimePicker
                value={form.startDateObj}
                mode="date"
                display="default"
                onChange={(event, d) => {
                  setShowStartPicker(false);
                  if (d) set({ startDateObj: d });
                }}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Repetir por tempo indeterminado</Text>
              <Switch
                value={form.noEndDate}
                onValueChange={(v) => set({ noEndDate: v })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            {!form.noEndDate && (
              <Field label="Repete até">
                <Pressable
                  onPress={() => setShowEndPicker(true)}
                  style={styles.dateButton}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                  <Text style={styles.dateText}>
                    {form.endDateObj.toLocaleDateString('pt-BR')}
                  </Text>
                </Pressable>
              </Field>
            )}
            {showEndPicker && (
              <DateTimePicker
                value={form.endDateObj}
                mode="date"
                display="default"
                onChange={(event, d) => {
                  setShowEndPicker(false);
                  if (d) set({ endDateObj: d });
                }}
              />
            )}

            <Text style={styles.hint}>
              O valor entra automaticamente nos lançamentos de cada mês, no dia{' '}
              {form.startDateObj.getDate()}, e conta para o teto da categoria.
            </Text>

            <PrimaryButton title="Salvar" onPress={handleSave} />
          </ScrollView>
        </ModalSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 12, lineHeight: 20 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ruleDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  ruleValue: { fontSize: 16, fontWeight: '800' },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 4 },
  actionBtn: { marginLeft: 12 },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeText: { fontSize: 15, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateText: { fontSize: 16, color: colors.text },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 4 },
});
