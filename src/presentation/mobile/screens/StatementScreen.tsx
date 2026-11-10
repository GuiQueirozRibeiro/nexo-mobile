/**
 * StatementScreen.tsx — Extrato Completo e Conciliação Multi-Banco (Padrão Bancário)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
  Alert,
} from 'react-native';

import { StatementExporterService } from '../../../core';

export interface MobileTransaction {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly category: string;
  readonly date: string;
  readonly type: 'CREDIT' | 'DEBIT';
  readonly bankName?: string;
  readonly endToEndId?: string;
}

interface StatementScreenProps {
  readonly onBack: () => void;
  readonly transactions?: readonly MobileTransaction[];
}

type FilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'PIX';

const DEFAULT_SAMPLE_TRANSACTIONS: readonly MobileTransaction[] = [
  {
    id: 'tx-1',
    description: 'PIX Recebido • João da Silva',
    amount: 850.0,
    category: 'Transferência Recebida',
    date: 'Hoje, 10:20',
    type: 'CREDIT',
    bankName: 'Asaas Pagamentos S.A.',
    endToEndId: 'E00038166202403101020a891f74',
  },
  {
    id: 'tx-2',
    description: 'Supermercado Pão de Açúcar',
    amount: 142.3,
    category: 'Alimentação',
    date: 'Hoje, 08:45',
    type: 'DEBIT',
    bankName: 'Nexo Mastercard',
    endToEndId: 'E00038166202403100845c432d11',
  },
  {
    id: 'tx-3',
    description: 'Posto Shell Combustível',
    amount: 89.5,
    category: 'Transporte',
    date: 'Ontem, 19:40',
    type: 'DEBIT',
    bankName: 'Nexo Mastercard',
    endToEndId: 'E00038166202403091940b221010',
  },
  {
    id: 'tx-4',
    description: 'Assinatura Google Cloud & Vercel',
    amount: 65.0,
    category: 'Tecnologia & Serviços',
    date: '08 Mar, 14:12',
    type: 'DEBIT',
    bankName: 'Nexo Virtual',
    endToEndId: 'E00038166202403081412e884192',
  },
  {
    id: 'tx-5',
    description: 'Aluguel & Condomínio',
    amount: 450.0,
    category: 'Moradia',
    date: '05 Mar, 11:30',
    type: 'DEBIT',
    bankName: 'Boleto Febraban',
    endToEndId: 'E00038166202403051130a009182',
  },
  {
    id: 'tx-6',
    description: 'Farmácia Drogasil',
    amount: 54.2,
    category: 'Saúde',
    date: '03 Mar, 16:15',
    type: 'DEBIT',
    bankName: 'Nexo Mastercard',
    endToEndId: 'E00038166202403031615d774211',
  },
];

export const StatementScreen: React.FC<StatementScreenProps> = ({
  onBack,
  transactions = [],
}) => {
  const activeTransactions = transactions.length > 0 ? transactions : DEFAULT_SAMPLE_TRANSACTIONS;
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<MobileTransaction | null>(null);
  const [showCategoryChart, setShowCategoryChart] = useState(false);

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  // Cálculo das categorias de despesas
  const categoryBreakdown = useMemo(() => {
    const expenses = activeTransactions.filter((t) => t.type === 'DEBIT');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    const map = new Map<string, number>();
    for (const tx of expenses) {
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }

    const categoryColors: Record<string, string> = {
      'Alimentação': '#ff5500',
      'Transporte': '#3b82f6',
      'Tecnologia & Serviços': '#a855f7',
      'Moradia': '#eab308',
      'Saúde': '#00d26a',
    };

    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
        color: categoryColors[category] ?? '#8e95a5',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeTransactions]);

  const filteredTransactions = useMemo(() => {
    return activeTransactions.filter((tx) => {
      // Filtro de tipo
      if (filterType === 'INCOME' && tx.type !== 'CREDIT') return false;
      if (filterType === 'EXPENSE' && tx.type !== 'DEBIT') return false;
      if (
        filterType === 'PIX' &&
        !tx.description.toLowerCase().includes('pix')
      ) {
        return false;
      }

      // Filtro de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(query);
        const catMatch = tx.category.toLowerCase().includes(query);
        return descMatch || catMatch;
      }

      return true;
    });
  }, [activeTransactions, filterType, searchQuery]);

  const handleShareReceipt = async (tx: MobileTransaction) => {
    try {
      await Share.share({
        message: `Comprovante Nexo Bank\n\nOperação: ${tx.description}\nValor: ${formatCurrency(tx.amount)}\nData: ${tx.date}\nID: ${tx.id}\nEnd-to-End: ${tx.endToEndId ?? 'N/A'}\nStatus: Liquidado com Sucesso`,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o comprovante.');
    }
  };

  const handleExportOfx = async () => {
    try {
      const ofxContent = StatementExporterService.generateOfx({
        bankName: 'Nexo Bank Pagamentos S.A.',
        bankCode: '341',
        accountNumber: '99412-8',
        transactions: transactions.map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          dateIso: new Date().toISOString(),
          category: t.category,
        })),
      });

      await Share.share({
        title: 'Extrato Bancário Nexo (OFX)',
        message: ofxContent,
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o arquivo OFX.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Extrato e Lançamentos</Text>
        <TouchableOpacity
          onPress={() => void handleExportOfx()}
          style={styles.exportHeaderButton}
        >
          <Text style={styles.exportHeaderText}>OFX</Text>
        </TouchableOpacity>
      </View>

      {/* Detalhe do Comprovante (Quando uma transação é selecionada) */}
      {selectedTx && (
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptModal}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptHeaderTitle}>Comprovante de Lançamento</Text>
              <TouchableOpacity
                onPress={() => setSelectedTx(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.receiptAmount}>
              {selectedTx.type === 'CREDIT' ? '+ ' : '- '}
              {formatCurrency(selectedTx.amount)}
            </Text>
            <Text style={styles.receiptDescription}>{selectedTx.description}</Text>

            <View style={styles.receiptDetailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo de Transação</Text>
                <Text style={styles.detailValue}>
                  {selectedTx.type === 'CREDIT' ? 'Entrada / Crédito' : 'Saída / Débito'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Categoria</Text>
                <Text style={styles.detailValue}>{selectedTx.category}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data e Hora</Text>
                <Text style={styles.detailValue}>{selectedTx.date}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Instituição</Text>
                <Text style={styles.detailValue}>{selectedTx.bankName ?? 'Nexo Bank Asaas'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tarifa Bancária</Text>
                <Text style={styles.detailValueGreen}>R$ 0,00 (Gratuito)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Autenticação BACEN</Text>
                <Text style={styles.detailValueSmall}>
                  {selectedTx.endToEndId ?? `E00038166${selectedTx.id.replace(/\D/g, '')}`}
                </Text>
              </View>
            </View>

            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => void handleShareReceipt(selectedTx)}
              >
                <Text style={styles.shareButtonText}>Compartilhar Comprovante</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Barra de Busca */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por descrição ou categoria..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Pílulas de Filtro & Alternador de Gráfico */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'ALL' as const, label: 'Todos' },
            { id: 'INCOME' as const, label: 'Entradas' },
            { id: 'EXPENSE' as const, label: 'Saídas' },
            { id: 'PIX' as const, label: 'PIX' },
          ].map((f) => {
            const active = filterType === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilterType(f.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.chartToggleBtn, showCategoryChart && styles.chartToggleBtnActive]}
            onPress={() => setShowCategoryChart((prev) => !prev)}
          >
            <Text style={styles.chartToggleText}>
              {showCategoryChart ? '✕ Fechar Gráfico' : '📊 Categorias'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Seção Gráfico de Categorias */}
      {showCategoryChart && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribuição de Gastos do Mês</Text>
          {categoryBreakdown.map((cat) => (
            <View key={cat.category} style={styles.catProgressItem}>
              <View style={styles.catProgressHeader}>
                <Text style={styles.catName}>{cat.category}</Text>
                <Text style={styles.catAmount}>
                  {formatCurrency(cat.amount)} ({cat.percentage}%)
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Lista de Transações */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>Nenhum lançamento encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Não foram localizadas transações para o filtro selecionado.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              style={styles.txItem}
              onPress={() => setSelectedTx(tx)}
              activeOpacity={0.7}
            >
              <View style={styles.txIconBadge}>
                <Text style={styles.txIconText}>
                  {tx.type === 'CREDIT' ? '↓' : '↑'}
                </Text>
              </View>

              <View style={styles.txInfo}>
                <Text style={styles.txTitle}>{tx.description}</Text>
                <Text style={styles.txMeta}>
                  {tx.category} • {tx.date}
                </Text>
              </View>

              <View style={styles.txAmountCol}>
                <Text
                  style={[
                    styles.txAmount,
                    tx.type === 'CREDIT' ? styles.txCredit : styles.txDebit,
                  ]}
                >
                  {tx.type === 'CREDIT' ? '+ ' : '- '}
                  {formatCurrency(tx.amount)}
                </Text>
                <Text style={styles.txStatusText}>Liquidado</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c0e',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1d24',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#ff5500',
    fontSize: 14,
    fontWeight: '600',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: '#12141a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#12141a',
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  filterPillActive: {
    backgroundColor: '#ff5500',
    borderColor: '#ff5500',
  },
  filterPillText: {
    color: '#8e929a',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  chartToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginLeft: 6,
  },
  chartToggleBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chartToggleText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#12141a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  chartTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  catProgressItem: {
    marginBottom: 12,
  },
  catProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    color: '#c5c9d3',
    fontSize: 12,
    fontWeight: '500',
  },
  catAmount: {
    color: '#8e929a',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1a1d26',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 12,
  },
  txIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#171a22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txIconText: {
    color: '#ff5500',
    fontSize: 18,
    fontWeight: '700',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  txMeta: {
    color: '#8e929a',
    fontSize: 11,
  },
  txAmountCol: {
    alignItems: 'flex-end',
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
  txStatusText: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#8e929a',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  receiptOverlay: {
    backgroundColor: '#0f1117',
    borderBottomWidth: 1,
    borderBottomColor: '#1d212b',
    padding: 20,
  },
  receiptModal: {
    gap: 14,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptHeaderTitle: {
    color: '#ff5500',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    color: '#8e929a',
    fontSize: 16,
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  receiptDescription: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '600',
  },
  receiptDetailsCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#8e929a',
    fontSize: 11,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  detailValueGreen: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  detailValueSmall: {
    color: '#9ca3af',
    fontSize: 9,
    maxWidth: '55%',
    textAlign: 'right',
  },
  receiptActions: {
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: '#ff5500',
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  exportHeaderButton: {
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ff5500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  exportHeaderText: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

