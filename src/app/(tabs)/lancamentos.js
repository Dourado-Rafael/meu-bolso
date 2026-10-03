import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  monthKeyOf,
  currentMonthKey,
  shiftMonth,
  monthLabel,
  fmtDateKey,
  toDateKey,
  uid,
} from '../../lib/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categories';
import {
  getTransactions,
  saveTransactions,
  getBudget,
  getRecurrings,
} from '../../lib/storage';
import { expandRecurrings, getMonthTransactions } from '../../lib/recurring';
import {
  Card,
  Fab,
  Input,
  Field,
  PrimaryButton,
  ModalSheet,
  Empty,
} from '../../components/ui';

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

function checkBudgetAlerts(allTx, tx, budget) {
  const msgs = [];
  const txMonth = monthKeyOf(tx.date);
  const monthExpenses = allTx
    .filter((t) => t.type === 'expense' && monthKeyOf(t.date) === txMonth)
    .reduce((s, t) => s + t.amount, 0);

  const monthlyLimit = Number(budget.monthlyLimit) || 0;
  if (monthlyLimit > 0) {
    if (monthExpenses >= monthlyLimit) {
      msgs.push(
        `Você atingiu o teto mensal de ${fmtBRL(monthlyLimit)} (${fmtBRL(monthExpenses)} gastos).`
      );
    } else if (monthExpenses >= monthlyLimit * 0.8) {
      msgs.push(
        `Atenção: você já usou 80% do teto mensal (${fmtBRL(monthExpenses)} de ${fmtBRL(monthlyLimit)}).`
      );
    }
  }

  const catLimit = Number(budget.categoryLimits?.[tx.category]) || 0;
  if (catLimit > 0) {
    const catTotal = allTx
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.category === tx.category &&
          monthKeyOf(t.date) === txMonth
      )
      .reduce((s, t) => s + t.amount, 0);
    if (catTotal >= catLimit) {
      msgs.push(
        `Teto da categoria "${tx.category}" atingido (${fmtBRL(catTotal)} de ${fmtBRL(catLimit)}).`
      );
    } else if (catTotal >= catLimit * 0.8) {
      msgs.push(`Atenção: 80% do teto da categoria "${tx.category}" já foi usado.`);
    }
  }

  if (msgs.length > 0) {
    Alert.alert('Limite de gastos', msgs.join('\n\n'));
  }
}

export default function TransactionsScreen() {
  const [month, setMonth] = useState(currentMonthKey());
  const [transactions, setTransactions] = useState([]);
  const [recurrings, setRecurrings] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

  // form state
  const [type, setType] = useState('expense');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [dateObj, setDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setTransactions(await getTransactions());
        setRecurrings(await getRecurrings());
      })();
    }, [])
  );

  const openModal = () => {
    setEditingId(null);
    setType('expense');
    setAmountText('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription('');
    setDateObj(new Date());
    setModalVisible(true);
  };

  const openEditModal = (t) => {
    if (t.recurring) {
      Alert.alert(
        'Lançamento recorrente',
        'Este lançamento é gerado automaticamente por uma conta recorrente. Para alterar o valor ou a descrição, edite a conta na aba Recorrentes.'
      );
      return;
    }
    setEditingId(t.id);
    setType(t.type);
    setAmountText(String(t.amount).replace('.', ','));
    setCategory(t.category);
    setDescription(t.description || '');
    const [y, m, d] = t.date.split('-').map(Number);
    setDateObj(new Date(y, m - 1, d));
    setModalVisible(true);
  };

  const handleTypeChange = (next) => {
    setType(next);
    setCategory(next === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  const handleSave = async () => {
    const amount = parseBRL(amountText);
    if (!amount || amount <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    let next;
    let tx;
    if (editingId) {
      tx = {
        id: editingId,
        type,
        amount,
        category,
        description: description.trim(),
        date: toDateKey(dateObj),
      };
      next = transactions.map((x) => (x.id === editingId ? tx : x));
    } else {
      tx = {
        id: uid(),
        type,
        amount,
        category,
        description: description.trim(),
        date: toDateKey(dateObj),
      };
      next = [tx, ...transactions];
    }
    await saveTransactions(next);
    setTransactions(next);
    setModalVisible(false);
    setEditingId(null);
    if (type === 'expense') {
      const budget = await getBudget();
      const txMonth = monthKeyOf(tx.date);
      const allForMonth = [
        ...next,
        ...expandRecurrings(recurrings, txMonth),
      ];
      checkBudgetAlerts(allForMonth, tx, budget);
    }
  };

  const handleDelete = (t) => {
    if (t.recurring) {
      Alert.alert(
        'Lançamento recorrente',
        'Este lançamento é gerado automaticamente por uma conta recorrente. Para alterar ou parar a repetição, vá na aba Recorrentes.'
      );
      return;
    }
    Alert.alert('Excluir lançamento', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const next = transactions.filter((x) => x.id !== t.id);
          await saveTransactions(next);
          setTransactions(next);
        },
      },
    ]);
  };

  const monthTx = getMonthTransactions(transactions, recurrings, month);

  const query = search.trim().toLowerCase();
  const visibleTx = query
    ? monthTx.filter((t) =>
        `${t.description || ''} ${t.category}`.toLowerCase().includes(query)
      )
    : monthTx;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Lançamentos</Text>
        <MonthNav month={month} onChange={setMonth} />
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por descrição ou categoria"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {visibleTx.length === 0 ? (
            <Empty
              text={
                query
                  ? 'Nenhum lançamento encontrado para essa busca.'
                  : 'Nenhum lançamento neste mês. Toque em + para adicionar.'
              }
            />
          ) : (
            visibleTx.map((t) => (
              <Pressable key={t.id} onPress={() => openEditModal(t)}>
                <Card style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc}>{t.description || t.category}</Text>
                    <Text style={styles.mutedSmall}>
                      {t.category} • {fmtDateKey(t.date)}
                    </Text>
                    {t.recurring && (
                      <View style={styles.recBadge}>
                        <Ionicons name="repeat" size={12} color={colors.primary} />
                        <Text style={styles.recBadgeText}>Recorrente</Text>
                      </View>
                    )}
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
                  <Pressable onPress={() => handleDelete(t)} hitSlop={10} style={{ marginLeft: 12 }}>
                    <Ionicons
                      name={t.recurring ? 'information-circle-outline' : 'trash-outline'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
        <Fab onPress={openModal} />

        <ModalSheet
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingId(null);
          }}
          title={editingId ? 'Editar lançamento' : 'Novo lançamento'}
        >
          <ScrollView>
            <View style={styles.typeToggle}>
              <Pressable
                onPress={() => handleTypeChange('expense')}
                style={[
                  styles.typeOption,
                  type === 'expense' && { backgroundColor: colors.expense },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    type === 'expense' && { color: '#fff' },
                  ]}
                >
                  Despesa
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleTypeChange('income')}
                style={[
                  styles.typeOption,
                  type === 'income' && { backgroundColor: colors.income },
                ]}
              >
                <Text
                  style={[styles.typeText, type === 'income' && { color: '#fff' }]}
                >
                  Receita
                </Text>
              </Pressable>
            </View>

            <Field label="Valor (R$)">
              <Input
                value={amountText}
                onChangeText={setAmountText}
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
                      onPress={() => setCategory(c)}
                      style={[
                        styles.chip,
                        category === c && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          category === c && { color: '#fff' },
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
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: mercado da semana"
              />
            </Field>

            <Field label="Data">
              <Pressable onPress={() => setShowPicker(true)} style={styles.dateButton}>
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={styles.dateText}>
                  {dateObj.toLocaleDateString('pt-BR')}
                </Text>
              </Pressable>
            </Field>
            {showPicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={(event, d) => {
                  setShowPicker(false);
                  if (d) setDateObj(d);
                }}
              />
            )}

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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  txDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  txValue: { fontSize: 16, fontWeight: '800' },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 4 },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF3FF',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  recBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
});
