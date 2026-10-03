import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
  fmtDateKey,
  toDateKey,
  todayKey,
  uid,
} from '../../lib/format';
import { getLoans, saveLoans } from '../../lib/storage';
import {
  Card,
  Fab,
  Input,
  Field,
  PrimaryButton,
  ModalSheet,
  Empty,
  SectionTitle,
} from '../../components/ui';

export default function DebtorsScreen() {
  const [loans, setLoans] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showPaid, setShowPaid] = useState(false);

  // form state
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [dateObj, setDateObj] = useState(new Date());
  const [expectedObj, setExpectedObj] = useState(null);
  const [pickerFor, setPickerFor] = useState(null); // 'date' | 'expected' | null

  useFocusEffect(
    useCallback(() => {
      (async () => setLoans(await getLoans()))();
    }, [])
  );

  const unpaid = loans.filter((l) => !l.paid);
  const paid = loans.filter((l) => l.paid);
  const toReceive = unpaid.reduce((s, l) => s + l.amount, 0);
  const recovered = paid.reduce((s, l) => s + l.amount, 0);

  const groups = {};
  unpaid.forEach((l) => {
    const key = l.person.trim() || 'Sem nome';
    (groups[key] = groups[key] || []).push(l);
  });
  const people = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const openModal = () => {
    setPerson('');
    setDescription('');
    setAmountText('');
    setDateObj(new Date());
    setExpectedObj(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amount = parseBRL(amountText);
    if (!person.trim()) {
      Alert.alert('Faltou o nome', 'Digite o nome de quem está te devendo.');
      return;
    }
    if (!amount || amount <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
      return;
    }
    const loan = {
      id: uid(),
      person: person.trim(),
      description: description.trim(),
      amount,
      date: toDateKey(dateObj),
      expectedDate: expectedObj ? toDateKey(expectedObj) : '',
      paid: false,
      paidAt: null,
    };
    const next = [loan, ...loans];
    await saveLoans(next);
    setLoans(next);
    setModalVisible(false);
  };

  const markPaid = async (id) => {
    const next = loans.map((l) =>
      l.id === id ? { ...l, paid: true, paidAt: todayKey() } : l
    );
    await saveLoans(next);
    setLoans(next);
  };

  const payAllForPerson = (personName) => {
    const items = groups[personName] || [];
    const total = items.reduce((s, l) => s + l.amount, 0);
    Alert.alert(
      'Quitar tudo',
      `Marcar ${fmtBRL(total)} de ${personName} como recebido?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const ids = new Set(items.map((l) => l.id));
            const next = loans.map((l) =>
              ids.has(l.id) ? { ...l, paid: true, paidAt: todayKey() } : l
            );
            await saveLoans(next);
            setLoans(next);
          },
        },
      ]
    );
  };

  const handleDelete = (id) => {
    Alert.alert('Excluir registro', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const next = loans.filter((l) => l.id !== id);
          await saveLoans(next);
          setLoans(next);
        },
      },
    ]);
  };

  const onPickerChange = (event, d) => {
    setPickerFor(null);
    if (!d) return;
    if (pickerFor === 'date') setDateObj(d);
    if (pickerFor === 'expected') setExpectedObj(d);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Quem me deve</Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <Card>
            <Text style={styles.statLabel}>Total a receber</Text>
            <Text style={[styles.bigValue, { color: colors.primary }]}>
              {fmtBRL(toReceive)}
            </Text>
            <Text style={styles.mutedSmall}>
              {people.length === 0
                ? 'Ninguém te devendo no momento.'
                : `${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'} com pendências`}
            </Text>
          </Card>

          {people.length === 0 ? (
            <Empty text="Nenhuma dívida registrada. Toque em + quando alguém te dever." />
          ) : (
            people.map((name) => {
              const items = groups[name].sort((a, b) =>
                a.date < b.date ? 1 : -1
              );
              const total = items.reduce((s, l) => s + l.amount, 0);
              const isOpen = expanded === name;
              return (
                <Card key={name} style={{ paddingVertical: 8 }}>
                  <Pressable
                    onPress={() => setExpanded(isOpen ? null : name)}
                    style={styles.personHeader}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{name}</Text>
                      <Text style={styles.mutedSmall}>
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </Text>
                    </View>
                    <Text style={styles.personTotal}>{fmtBRL(total)}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>

                  {isOpen && (
                    <View style={styles.itemsBox}>
                      {items.map((l) => (
                        <View key={l.id} style={styles.loanItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.loanDesc}>
                              {l.description || 'Sem descrição'}
                            </Text>
                            <Text style={styles.mutedSmall}>
                              {fmtDateKey(l.date)}
                              {l.expectedDate
                                ? ` • prev. ${fmtDateKey(l.expectedDate)}`
                                : ''}
                            </Text>
                          </View>
                          <Text style={styles.loanValue}>{fmtBRL(l.amount)}</Text>
                          <Pressable
                            onPress={() => markPaid(l.id)}
                            hitSlop={10}
                            style={styles.iconBtn}
                          >
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={22}
                              color={colors.income}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDelete(l.id)}
                            hitSlop={10}
                            style={styles.iconBtn}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color={colors.muted}
                            />
                          </Pressable>
                        </View>
                      ))}
                      <PrimaryButton
                        title="Quitar tudo"
                        onPress={() => payAllForPerson(name)}
                      />
                    </View>
                  )}
                </Card>
              );
            })
          )}

          {paid.length > 0 && (
            <>
              <Pressable
                onPress={() => setShowPaid(!showPaid)}
                style={styles.historyToggle}
              >
                <SectionTitle style={{ marginBottom: 0, marginTop: 0 }}>
                  Recebidos ({fmtBRL(recovered)})
                </SectionTitle>
                <Ionicons
                  name={showPaid ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
              {showPaid &&
                paid.map((l) => (
                  <Card key={l.id} style={styles.paidRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loanDesc}>
                        {l.person} • {l.description || 'Sem descrição'}
                      </Text>
                      <Text style={styles.mutedSmall}>
                        Recebido em {l.paidAt ? fmtDateKey(l.paidAt) : '—'}
                      </Text>
                    </View>
                    <Text style={[styles.loanValue, { color: colors.income }]}>
                      {fmtBRL(l.amount)}
                    </Text>
                    <Pressable
                      onPress={() => handleDelete(l.id)}
                      hitSlop={10}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.muted} />
                    </Pressable>
                  </Card>
                ))}
            </>
          )}
        </ScrollView>
        <Fab onPress={openModal} />

        <ModalSheet
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="Nova dívida"
        >
          <ScrollView>
            <Field label="Quem está te devendo?">
              <Input
                value={person}
                onChangeText={setPerson}
                placeholder="Ex: Carlos"
              />
            </Field>
            <Field label="O que foi?">
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: churrasco dividido, empréstimo"
              />
            </Field>
            <Field label="Valor (R$)">
              <Input
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0,00"
              />
            </Field>
            <Field label="Data">
              <Pressable
                onPress={() => setPickerFor('date')}
                style={styles.dateButton}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={styles.dateText}>
                  {dateObj.toLocaleDateString('pt-BR')}
                </Text>
              </Pressable>
            </Field>
            <Field label="Previsão de pagamento (opcional)">
              <Pressable
                onPress={() => setPickerFor('expected')}
                style={styles.dateButton}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={styles.dateText}>
                  {expectedObj
                    ? expectedObj.toLocaleDateString('pt-BR')
                    : 'Sem previsão'}
                </Text>
              </Pressable>
              {expectedObj && (
                <Pressable
                  onPress={() => setExpectedObj(null)}
                  style={styles.clearExpected}
                >
                  <Text style={styles.clearExpectedText}>Limpar previsão</Text>
                </Pressable>
              )}
            </Field>
            {pickerFor && (
              <DateTimePicker
                value={pickerFor === 'date' ? dateObj : expectedObj || new Date()}
                mode="date"
                display="default"
                onChange={onPickerChange}
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
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  statLabel: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  bigValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  mutedSmall: { fontSize: 13, color: colors.muted, marginTop: 4 },
  personHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  personName: { fontSize: 16, fontWeight: '700', color: colors.text },
  personTotal: { fontSize: 16, fontWeight: '800', color: colors.expense, marginRight: 8 },
  itemsBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  loanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  loanDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  loanValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginLeft: 8 },
  iconBtn: { marginLeft: 10 },
  paidRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
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
  clearExpected: { marginTop: 6, alignSelf: 'flex-start' },
  clearExpectedText: { fontSize: 13, color: colors.expense, fontWeight: '600' },
});
