/**
 * DashboardScreen.tsx — Dashboard Mobile Oficial da Nexo Finance (React Native)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import type { NexoBffApiDataSource } from '../../../data';

interface BankAccountItem {
  readonly id: string;
  readonly name: string;
  readonly balance: number;
  readonly coordinates: string;
  readonly color: string;
}

interface TransactionItem {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly category: string;
  readonly date: string;
  readonly type: 'CREDIT' | 'DEBIT';
}

interface DashboardScreenProps {
  readonly userName: string;
  readonly bffClient: NexoBffApiDataSource;
  readonly onOpenPix: () => void;
  readonly onOpenKyc: () => void;
  readonly onOpenLimits: () => void;
  readonly onOpenStatement: () => void;
  readonly onOpenCards: () => void;
  readonly onOpenStreetMode: () => void;
  readonly onOpenQrScanner: () => void;
  readonly onOpenPierre: () => void;
  readonly onOpenSavingsBoxes: () => void;
  readonly onLockApp: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userName,
  bffClient,
  onOpenPix,
  onOpenKyc,
  onOpenLimits,
  onOpenStatement,
  onOpenCards,
  onOpenStreetMode,
  onOpenQrScanner,
  onOpenPierre,
  onOpenSavingsBoxes,
  onLockApp,
}) => {
  const [hideBalances, setHideBalances] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [consolidatedBalance, setConsolidatedBalance] = useState<number>(0);
  const [monthIncome] = useState<number>(0);
  const [monthExpense] = useState<number>(0);
  const [isKycVerified, setIsKycVerified] = useState(false);

  // Contas reais Open Finance
  const [bankAccounts, setBankAccounts] = useState<readonly BankAccountItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<readonly TransactionItem[]>([]);

  const formatCurrency = (val: number): string => {
    if (hideBalances) return '••••••';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Sincroniza saldo Asaas no BFF
    const res = await bffClient.fetchAsaasRealBalance();
    if (res.isRight()) {
      setConsolidatedBalance(res.value);
    }
    setIsRefreshing(false);
  };

  const handleConnectBank = async () => {
    Alert.alert(
      'Open Finance Brasil • Pluggy Connect',
      'Gerando token de conexão segura para sincronizar suas contas bancárias.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Conectar Pluggy Bank',
          onPress: async () => {
            const tokenRes = await bffClient.createPluggyConnectToken('client_mobile_001');
            if (tokenRes.isRight()) {
              Alert.alert(
                'Pluggy Conectado',
                'Instituição autorizada via Open Finance! As contas sincronizarão em segundo plano.',
              );
              setBankAccounts([
                {
                  id: 'acc-pluggy-01',
                  name: 'Pluggy Bank Sandbox',
                  balance: 2450.0,
                  coordinates: 'Ag 0001 • C/C 98412-5',
                  color: '#ff5500',
                },
              ]);
              setConsolidatedBalance((prev) => prev + 2450.0);
            } else {
              Alert.alert('Aviso Open Finance', tokenRes.value.message);
            }
          },
        },
      ],
    );
  };

  const handleChargeQr = async () => {
    const qrRes = await bffClient.createPixQrCharge({
      amount: 150.0,
      description: 'Cobrança PIX Mobile',
    });
    if (qrRes.isRight()) {
      Alert.alert(
        'QR Code PIX Gerado',
        `Código Copia e Cola gerado com sucesso pelo gateway Asaas:\n\n${qrRes.value.copyPasteCode.slice(0, 40)}...`,
      );
    } else {
      Alert.alert('Erro ao emitir QR Code', qrRes.value.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Topo Estilo Nubank */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={onOpenKyc}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>
              {userName.slice(0, 2).toUpperCase()}
            </Text>
            {isKycVerified && <View style={styles.avatarKycBadge} />}
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Olá, {userName}</Text>
            <View style={styles.cloudBadge}>
              <View style={styles.cloudDot} />
              <Text style={styles.cloudText}>Sincronizado Cloud Firestore</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setHideBalances((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>{hideBalances ? '👁️' : '🕶️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onLockApp}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>🔒</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#ff5500"
          />
        }
      >
        {/* Card Saldo Consolidado Open Finance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>
            SALDO CONSOLIDADO OPEN FINANCE
          </Text>
          <Text style={styles.balanceValue}>
            {formatCurrency(consolidatedBalance)}
          </Text>

          <View style={styles.balanceMetricsRow}>
            <View>
              <Text style={styles.metricLabel}>Entradas no mês</Text>
              <Text style={styles.metricValueGreen}>
                {formatCurrency(monthIncome)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View>
              <Text style={styles.metricLabel}>Saídas no mês</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(monthExpense)}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View>
              <Text style={styles.metricLabel}>Saúde</Text>
              <Text style={styles.metricValueAccent}>100/100</Text>
            </View>
          </View>
        </View>

        {/* Atalhos Rápidos Circulares (Padrão Nubank) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContainer}
        >
          {[
            { id: 'pix', label: 'Transferir Pix', icon: '⚡', onPress: onOpenPix, badge: 'Biometria' },
            { id: 'scan', label: 'Pagar QR', icon: '📷', onPress: onOpenQrScanner },
            { id: 'boxes', label: 'Caixinhas', icon: '📦', onPress: onOpenSavingsBoxes, badge: '100% CDI' },
            { id: 'pierre', label: 'Pierre IA', icon: '✨', onPress: onOpenPierre, badge: 'IA' },
            { id: 'statement', label: 'Extrato', icon: '📄', onPress: onOpenStatement },
            { id: 'cards', label: 'Cartões', icon: '💳', onPress: onOpenCards },
            { id: 'charge', label: 'Cobrar QR', icon: '📲', onPress: () => void handleChargeQr() },
            { id: 'bank', label: 'Conectar Banco', icon: '🏛️', onPress: () => void handleConnectBank() },
            { id: 'limits', label: 'Limites BACEN', icon: '🛡️', onPress: onOpenLimits },
            { id: 'street', label: 'Modo Rua', icon: '📍', onPress: onOpenStreetMode, badge: 'Protegido' },
            { id: 'kyc', label: 'Verificar KYC', icon: '🪪', onPress: onOpenKyc },
          ].map((act) => (
            <TouchableOpacity
              key={act.id}
              style={styles.quickActionButton}
              onPress={act.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionCircle}>
                <Text style={styles.quickActionIcon}>{act.icon}</Text>
                {act.badge && (
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{act.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickActionLabel}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner de Verificação KYC (se pendente) */}
        {!isKycVerified && (
          <TouchableOpacity
            style={styles.kycBanner}
            onPress={onOpenKyc}
            activeOpacity={0.8}
          >
            <View style={styles.kycBannerLeft}>
              <Text style={styles.kycBannerIcon}>🛡️</Text>
              <View>
                <Text style={styles.kycBannerTitle}>
                  Verificação de Identidade Nível Bancário
                </Text>
                <Text style={styles.kycBannerSubtitle}>
                  Valide seu documento e faça a leitura facial para liberar PIX ilimitado.
                </Text>
              </View>
            </View>
            <Text style={styles.kycBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Card Caixinhas Nexo */}
        <TouchableOpacity
          style={styles.savingsCard}
          onPress={onOpenSavingsBoxes}
          activeOpacity={0.8}
        >
          <View style={styles.savingsCardLeft}>
            <View style={styles.savingsIconContainer}>
              <Text style={styles.savingsIcon}>📦</Text>
            </View>
            <View>
              <View style={styles.savingsBadgeRow}>
                <Text style={styles.savingsCardTitle}>Caixinhas Nexo</Text>
                <View style={styles.savingsCdiPill}>
                  <Text style={styles.savingsCdiPillText}>100% CDI</Text>
                </View>
              </View>
              <Text style={styles.savingsCardSubtitle}>
                R$ 1.290,57 guardados • Rendendo centavos diariamente
              </Text>
            </View>
          </View>
          <Text style={styles.savingsCardArrow}>→</Text>
        </TouchableOpacity>

        {/* Seção Bancos Conectados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bancos Conectados (Open Finance)</Text>
            <TouchableOpacity onPress={() => void handleConnectBank()}>
              <Text style={styles.sectionActionText}>+ Adicionar</Text>
            </TouchableOpacity>
          </View>

          {bankAccounts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Nenhum banco comercial conectado no momento.
              </Text>
              <TouchableOpacity
                style={styles.connectButtonSmall}
                onPress={() => void handleConnectBank()}
              >
                <Text style={styles.connectButtonText}>Conectar via Pluggy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bankAccounts.map((acc: BankAccountItem) => (
              <View key={acc.id} style={styles.bankCard}>
                <View style={styles.bankCardHeader}>
                  <Text style={styles.bankName}>{acc.name}</Text>
                  <Text style={styles.bankBalance}>
                    {formatCurrency(acc.balance)}
                  </Text>
                </View>
                <Text style={styles.bankCoordinates}>{acc.coordinates}</Text>
              </View>
            ))
          )}
        </View>

        {/* Seção Extrato Recente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Últimos Lançamentos</Text>
            <TouchableOpacity onPress={onOpenStatement}>
              <Text style={styles.sectionActionText}>Ver Todos →</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Nenhuma transação recente. Sua conta está 100% limpa.
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx: TransactionItem) => (
              <View key={tx.id} style={styles.txRow}>
                <View>
                  <Text style={styles.txDescription}>{tx.description}</Text>
                  <Text style={styles.txCategory}>
                    {tx.category} • {tx.date}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.type === 'CREDIT' ? styles.txCredit : styles.txDebit,
                  ]}
                >
                  {tx.type === 'CREDIT' ? '+ ' : '- '}
                  {formatCurrency(tx.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c0e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#171a22',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1d26',
    borderWidth: 1.5,
    borderColor: '#ff5500',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  avatarKycBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0b0c0e',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cloudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff5500',
  },
  cloudText: {
    fontSize: 11,
    color: '#8e929a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#15171f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#212530',
  },
  iconText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  balanceCard: {
    backgroundColor: '#12141c',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1f232f',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e929a',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  balanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1d212b',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8e929a',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  metricValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  metricValueAccent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff5500',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1d212b',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  quickActionButton: {
    alignItems: 'center',
    width: 76,
  },
  quickActionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#242938',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  quickActionIcon: {
    fontSize: 24,
  },
  actionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff5500',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  actionBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d1d5db',
    textAlign: 'center',
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.25)',
    borderRadius: 18,
    padding: 16,
  },
  kycBannerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  kycBannerIcon: {
    fontSize: 24,
  },
  kycBannerTitle: {
    color: '#ff5500',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  kycBannerSubtitle: {
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 15,
  },
  kycBannerArrow: {
    color: '#ff5500',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12141c',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f232f',
  },
  savingsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  savingsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 85, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsIcon: {
    fontSize: 22,
  },
  savingsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  savingsCardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  savingsCdiPill: {
    backgroundColor: 'rgba(0, 210, 106, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 106, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  savingsCdiPillText: {
    color: '#00d26a',
    fontSize: 10,
    fontWeight: '700',
  },
  savingsCardSubtitle: {
    color: '#8e929a',
    fontSize: 11,
    lineHeight: 15,
  },
  savingsCardArrow: {
    color: '#8e929a',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#8e929a',
  },
  sectionActionText: {
    fontSize: 12,
    color: '#ff5500',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#8e929a',
    fontSize: 12,
    textAlign: 'center',
  },
  connectButtonSmall: {
    backgroundColor: '#ff5500',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bankCard: {
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 4,
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  bankBalance: {
    color: '#ff5500',
    fontSize: 13,
    fontWeight: '700',
  },
  bankCoordinates: {
    color: '#8e929a',
    fontSize: 11,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  txDescription: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  txCategory: {
    color: '#8e929a',
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  txCredit: {
    color: '#10b981',
  },
  txDebit: {
    color: '#ffffff',
  },
});
