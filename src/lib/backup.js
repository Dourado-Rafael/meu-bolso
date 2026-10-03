import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  getTransactions,
  saveTransactions,
  getLoans,
  saveLoans,
  getBudget,
  saveBudget,
  getRecurrings,
  saveRecurrings,
} from './storage';

const BACKUP_VERSION = 1;

function backupFileName() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `meu-bolso-backup-${stamp}.json`;
}

async function writeTextFile(file, text) {
  const writable = file.writableStream();
  const writer = writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(text));
  } finally {
    await writer.close();
  }
}

/**
 * Gera o arquivo de backup e abre o compartilhamento do sistema
 * (salvar no Drive, enviar por WhatsApp/e-mail, etc.).
 * Retorna true se o backup foi gerado.
 */
export async function exportBackup() {
  const [transactions, loans, budget, recurrings] = await Promise.all([
    getTransactions(),
    getLoans(),
    getBudget(),
    getRecurrings(),
  ]);

  const payload = {
    app: 'meu-bolso',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { transactions, loans, budget, recurrings },
  };

  const file = new File(Paths.cache, backupFileName());
  await writeTextFile(file, JSON.stringify(payload));

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Compartilhamento não disponível neste aparelho.');
  }
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Salvar backup do Meu Bolso',
    mimeType: 'application/json',
  });
  return true;
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'Arquivo inválido.';
  if (parsed.app !== 'meu-bolso') return 'Este arquivo não é um backup do Meu Bolso.';
  const data = parsed.data;
  if (!data || typeof data !== 'object') return 'Backup sem dados.';
  if (!Array.isArray(data.transactions)) return 'Backup corrompido (lançamentos).';
  if (!Array.isArray(data.loans)) return 'Backup corrompido (devedores).';
  if (!Array.isArray(data.recurrings)) return 'Backup corrompido (recorrentes).';
  if (!data.budget || typeof data.budget !== 'object') return 'Backup corrompido (teto).';
  return null;
}

/**
 * Abre o seletor de arquivos, lê o backup escolhido e valida.
 * Retorna { data } se válido, ou { canceled: true } se o usuário desistiu.
 * Lança Error com mensagem amigável se o arquivo for inválido.
 */
export async function pickBackupFile() {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json'],
  });
  if (result.canceled) {
    return { canceled: true };
  }
  const picked = result.result;
  let parsed;
  try {
    parsed = await picked.json();
  } catch {
    throw new Error('Não consegui ler este arquivo. Escolha um backup .json do Meu Bolso.');
  }
  const problem = validateBackup(parsed);
  if (problem) {
    throw new Error(problem);
  }
  return { data: parsed.data, exportedAt: parsed.exportedAt };
}

/**
 * Substitui todos os dados do app pelos dados do backup.
 * ATENÇÃO: apaga os dados atuais.
 */
export async function restoreBackup(data) {
  await saveTransactions(Array.isArray(data.transactions) ? data.transactions : []);
  await saveLoans(Array.isArray(data.loans) ? data.loans : []);
  await saveRecurrings(Array.isArray(data.recurrings) ? data.recurrings : []);
  const budget = data.budget || {};
  await saveBudget({
    monthlyLimit: Number(budget.monthlyLimit) || 0,
    categoryLimits:
      budget.categoryLimits && typeof budget.categoryLimits === 'object'
        ? budget.categoryLimits
        : {},
  });
}
