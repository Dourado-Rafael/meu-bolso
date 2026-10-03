import AsyncStorage from '@react-native-async-storage/async-storage';

// Modelos:
// Transaction: { id, type: 'income' | 'expense', amount: number, category: string, description: string, date: 'yyyy-mm-dd' }
// Loan:        { id, person: string, description: string, amount: number, date: 'yyyy-mm-dd', expectedDate: '' | 'yyyy-mm-dd', paid: boolean, paidAt: null | 'yyyy-mm-dd' }
// Budget:      { monthlyLimit: number, categoryLimits: { [category]: number } }
// Recurring:   { id, type: 'income' | 'expense', amount: number, category: string, description: string, startDate: 'yyyy-mm-dd', endDate: '' | 'yyyy-mm-dd', createdAt: number }
//   Recorrência mensal: gera uma instância por mês no dia de startDate
//   (ajustado para o último dia do mês quando o dia não existe).
//   endDate vazio = repete por tempo indeterminado.

const KEYS = {
  transactions: '@meubolso:transactions:v1',
  loans: '@meubolso:loans:v1',
  budget: '@meubolso:budget:v1',
  recurrings: '@meubolso:recurrings:v1',
};

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const getTransactions = () => read(KEYS.transactions, []);
export const saveTransactions = (list) => write(KEYS.transactions, list);

export const getLoans = () => read(KEYS.loans, []);
export const saveLoans = (list) => write(KEYS.loans, list);

export const DEFAULT_BUDGET = { monthlyLimit: 0, categoryLimits: {} };
export const getBudget = () => read(KEYS.budget, { ...DEFAULT_BUDGET });
export const saveBudget = (budget) => write(KEYS.budget, budget);

export const getRecurrings = () => read(KEYS.recurrings, []);
export const saveRecurrings = (list) => write(KEYS.recurrings, list);
