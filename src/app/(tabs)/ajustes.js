import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/theme';
import { Card, SectionTitle } from '../../components/ui';
import { exportBackup, pickBackupFile, restoreBackup } from '../../lib/backup';

function OptionRow({ icon, title, subtitle, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
          <Ionicons
            name={icon}
            size={22}
            color={danger ? colors.expense : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, danger && { color: colors.expense }]}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Não foi possível criar o backup', e.message || 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const picked = await pickBackupFile();
      if (picked.canceled) return;
      const when = picked.exportedAt
        ? new Date(picked.exportedAt).toLocaleString('pt-BR')
        : 'data desconhecida';
      Alert.alert(
        'Restaurar backup',
        `Backup de ${when}.\n\nAtenção: os dados atuais do app serão substituídos pelos dados do backup. Deseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(picked.data);
                Alert.alert(
                  'Backup restaurado',
                  'Seus dados foram restaurados com sucesso.'
                );
              } catch (e) {
                Alert.alert('Erro ao restaurar', e.message || 'Tente novamente.');
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Arquivo inválido', e.message || 'Escolha um backup válido do Meu Bolso.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ajustes</Text>

        <SectionTitle>Backup dos dados</SectionTitle>
        <Card style={styles.card}>
          <OptionRow
            icon="cloud-upload-outline"
            title="Fazer backup"
            subtitle="Salva tudo (lançamentos, devedores, tetos e recorrentes) num arquivo para guardar em local seguro."
            onPress={handleExport}
          />
          <View style={styles.divider} />
          <OptionRow
            icon="cloud-download-outline"
            title="Restaurar backup"
            subtitle="Recupera os dados a partir de um arquivo de backup. Substitui os dados atuais."
            onPress={handleImport}
            danger
          />
        </Card>

        <Text style={styles.hint}>
          Dica: faça um backup de vez em quando e guarde no Google Drive ou envie para
          você mesmo no WhatsApp. Se trocar de celular ou desinstalar o app, o backup
          recupera tudo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  card: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: '#FDECEC' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 4, paddingHorizontal: 4 },
});
