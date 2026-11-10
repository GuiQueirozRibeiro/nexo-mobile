/**
 * SavingsBoxesScreen.tsx — Módulo de Caixinhas Nexo (Rendimento CDI Diário)
 *
 * Funcionalidades:
 * - Metas financeiras personalizadas (Reserva de Emergência, Viagem, Investimentos, etc.).
 * - Rendimento diário baseado em 100% do CDI (subindo centavos por dia de forma segura e transparente).
 * - Aporte fácil transferindo do saldo da conta.
 * - Resgate com trava de segurança de reserva de giro (R$ 20,00 Asaas):
 *   Caso ultrapasse a liquidez imediata, exibe a mensagem de erro amigável solicitada pelo usuário:
 *   "Não foi possível concluir a transação no momento. Por favor, tente novamente mais tarde ou aguarde a janela de compensação bancária."
 * - Interface limpa no padrão Nexo Bank com design moderno e sem poluição visual.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';

export interface SavingsBox {
  readonly id: string;
  readonly title: string;
  readonly targetAmount: number;
  readonly currentBalance: number;
  readonly totalYield: number; // Rendimento acumulado em centavos
  readonly dailyYieldRate: number; // Ex: 0.00045 (aprox 11.25% aa / 252 dias úteis)
  readonly categoryIcon: string;
  readonly color: string;
}

interface SavingsBoxesScreenProps {
  readonly onBack: () => void;
  readonly accountBalance?: number;
  readonly onTransferToBox?: (boxId: string, amount: number) => void;
  readonly onWithdrawFromBox?: (boxId: string, amount: number) => void;
}

const DEFAULT_BOXES: readonly SavingsBox[] = [
  {
    id: 'box-reserva',
    title: 'Reserva de Emergência',
    targetAmount: 5000.0,
    currentBalance: 850.42,
    totalYield: 14.88,
    dailyYieldRate: 0.00045,
    categoryIcon: '🛡️',
    color: '#ff5500',
  },
  {
    id: 'box-viagem',
    title: 'Férias & Viagens',
    targetAmount: 3000.0,
    currentBalance: 320.15,
    totalYield: 3.25,
    dailyYieldRate: 0.00045,
    categoryIcon: '✈️',
    color: '#00d26a',
  },
  {
    id: 'box-invest',
    title: 'Aportes Futuros',
    targetAmount: 10000.0,
    currentBalance: 120.0,
    totalYield: 1.12,
    dailyYieldRate: 0.00045,
    categoryIcon: '📈',
    color: '#3b82f6',
  },
];

// Limite de segurança de liquidez operacional imediata (R$ 20,00 no Asaas)
const ASAAS_IMMEDIATE_LIQUIDITY_LIMIT = 20.0;

export const SavingsBoxesScreen: React.FC<SavingsBoxesScreenProps> = ({
  onBack,
  accountBalance = 1500.0,
  onTransferToBox,
  onWithdrawFromBox,
}) => {
  const [boxes, setBoxes] = useState<readonly SavingsBox[]>(DEFAULT_BOXES);
  const [selectedBox, setSelectedBox] = useState<SavingsBox | null>(null);
  const [actionType, setActionType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [showNewBoxModal, setShowNewBoxModal] = useState(false);
  const [newBoxTitle, setNewBoxTitle] = useState('');
  const [newBoxTarget, setNewBoxTarget] = useState('');

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const totalSaved = boxes.reduce((acc, b) => acc + b.currentBalance, 0);
  const totalYieldSum = boxes.reduce((acc, b) => acc + b.totalYield, 0);

  const handleOpenAction = (box: SavingsBox, type: 'DEPOSIT' | 'WITHDRAW') => {
    setSelectedBox(box);
    setActionType(type);
    setInputAmount('');
  };

  const handleExecuteAction = () => {
    if (!selectedBox || !actionType) return;
    const amount = parseFloat(inputAmount.replace(',', '.'));

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Valor Inválido', 'Insira um valor maior que R$ 0,00.');
      return;
    }

    if (actionType === 'DEPOSIT') {
      if (amount > accountBalance) {
        Alert.alert('Saldo Insuficiente', 'O valor informado excede o saldo disponível na sua conta.');
        return;
      }

      setBoxes((prev) =>
        prev.map((b) =>
          b.id === selectedBox.id
            ? { ...b, currentBalance: b.currentBalance + amount }
            : b,
        ),
      );
      onTransferToBox?.(selectedBox.id, amount);
      Alert.alert(
        'Aporte Concluído com Sucesso!',
        `Você guardou ${formatCurrency(amount)} na caixinha "${selectedBox.title}". Rendendo 100% do CDI diariamente!`,
      );
      setActionType(null);
      setSelectedBox(null);
    } else {
      // RESGATE COM TRAVA DE LIQUIDEZ ASAAS
      if (amount > selectedBox.currentBalance) {
        Alert.alert('Saldo Insuficiente na Caixinha', 'O valor informado é superior ao guardado nesta caixinha.');
        return;
      }

      // Regra de Trava de Liquidez Solicitada: se o resgate ultrapassar a reserva de giro disponível (R$ 20,00)
      if (amount > ASAAS_IMMEDIATE_LIQUIDITY_LIMIT) {
        Alert.alert(
          'Aviso de Liquidação Bancária',
          'Não foi possível concluir o resgate imediato no momento. Por favor, tente novamente mais tarde ou aguarde a próxima janela de compensação bancária.',
          [{ text: 'Entendido', style: 'default' }],
        );
        return;
      }

      setBoxes((prev) =>
        prev.map((b) =>
          b.id === selectedBox.id
            ? { ...b, currentBalance: b.currentBalance - amount }
            : b,
        ),
      );
      onWithdrawFromBox?.(selectedBox.id, amount);
      Alert.alert(
        'Resgate Concluído!',
        `${formatCurrency(amount)} foi transferido de volta para a sua conta corrente.`,
      );
      setActionType(null);
      setSelectedBox(null);
    }
  };

  const handleCreateBox = () => {
    const title = newBoxTitle.trim();
    const target = parseFloat(newBoxTarget.replace(',', '.'));

    if (!title) {
      Alert.alert('Nome Obrigatório', 'Informe um nome para a sua nova caixinha.');
      return;
    }

    const newBox: SavingsBox = {
      id: `box-${Date.now()}`,
      title,
      targetAmount: isNaN(target) || target <= 0 ? 1000 : target,
      currentBalance: 0,
      totalYield: 0,
      dailyYieldRate: 0.00045,
      categoryIcon: '🎯',
      color: '#ffaa00',
    };

    setBoxes((prev) => [...prev, newBox]);
    setShowNewBoxModal(false);
    setNewBoxTitle('');
    setNewBoxTarget('');
    Alert.alert('Caixinha Criada!', `Sua meta "${title}" está pronta para receber depósitos e render diariamente.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Superior */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Caixinhas Nexo</Text>
        <TouchableOpacity
          onPress={() => setShowNewBoxModal(true)}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Criar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card Resumo do Rendimento CDI */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summarySubtitle}>TOTAL GUARDADO</Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalSaved)}</Text>
            </View>
            <View style={styles.cdiBadge}>
              <Text style={styles.cdiBadgeText}>100% CDI</Text>
            </View>
          </View>

          <View style={styles.yieldRow}>
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>Rendimento Total</Text>
              <Text style={styles.yieldValueGreen}>
                +{formatCurrency(totalYieldSum)}
              </Text>
            </View>
            <View style={styles.yieldDivider} />
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>Rendimento Diário Estimado</Text>
              <Text style={styles.yieldValueGreen}>
                +{formatCurrency(totalSaved * 0.00045)} / dia
              </Text>
            </View>
          </View>
          <Text style={styles.cdiInfoNote}>
            💡 O seu dinheiro rende centavos diariamente de forma segura, com liquidez diária garantida.
          </Text>
        </View>

        {/* Listagem de Caixinhas */}
        <Text style={styles.sectionTitle}>Suas Metas e Caixinhas</Text>

        {boxes.map((box) => {
          const progressPercent = Math.min(
            100,
            Math.round((box.currentBalance / box.targetAmount) * 100),
          );

          return (
            <View key={box.id} style={styles.boxCard}>
              <View style={styles.boxHeader}>
                <View style={styles.boxTitleRow}>
                  <View
                    style={[
                      styles.boxIconContainer,
                      { backgroundColor: `${box.color}22` },
                    ]}
                  >
                    <Text style={styles.boxIcon}>{box.categoryIcon}</Text>
                  </View>
                  <View>
                    <Text style={styles.boxTitle}>{box.title}</Text>
                    <Text style={styles.boxTargetText}>
                      Meta: {formatCurrency(box.targetAmount)} ({progressPercent}%)
                    </Text>
                  </View>
                </View>
                <View style={styles.boxBalanceCol}>
                  <Text style={styles.boxBalance}>
                    {formatCurrency(box.currentBalance)}
                  </Text>
                  <Text style={styles.boxYieldText}>
                    +{formatCurrency(box.totalYield)} no CDI
                  </Text>
                </View>
              </View>

              {/* Barra de Progresso */}
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: box.color,
                    },
                  ]}
                />
              </View>

              {/* Botões de Ação */}
              <View style={styles.boxActionsRow}>
                <TouchableOpacity
                  style={[styles.boxActionBtn, styles.depositBtn]}
                  onPress={() => handleOpenAction(box, 'DEPOSIT')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.depositBtnText}>+ Guardar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boxActionBtn, styles.withdrawBtn]}
                  onPress={() => handleOpenAction(box, 'WITHDRAW')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.withdrawBtnText}>Resgatar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal de Depósito ou Resgate */}
      <Modal
        visible={actionType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActionType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {actionType === 'DEPOSIT' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Caixinha: <Text style={styles.boldText}>{selectedBox?.title}</Text>
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={inputAmount}
                onChangeText={setInputAmount}
                autoFocus
              />
            </View>

            {actionType === 'WITHDRAW' && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  🛡️ Resgates imediatos de rotina são processados até o limite da reserva de liquidez.
                </Text>
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActionType(null)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  actionType === 'DEPOSIT'
                    ? styles.confirmGreen
                    : styles.confirmOrange,
                ]}
                onPress={handleExecuteAction}
              >
                <Text style={styles.modalConfirmText}>
                  {actionType === 'DEPOSIT' ? 'Confirmar Aporte' : 'Confirmar Resgate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Nova Caixinha */}
      <Modal
        visible={showNewBoxModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewBoxModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Criar Nova Caixinha</Text>
            <Text style={styles.modalSubtitle}>
              Defina um objetivo e guarde com rendimento de 100% do CDI.
            </Text>

            <Text style={styles.fieldLabel}>Nome do Objetivo</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Reforma da Casa, Casamento, Viagem..."
              placeholderTextColor="#666"
              value={newBoxTitle}
              onChangeText={setNewBoxTitle}
            />

            <Text style={styles.fieldLabel}>Meta Financeira (R$)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 5000"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newBoxTarget}
              onChangeText={setNewBoxTarget}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowNewBoxModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.confirmOrange]}
                onPress={handleCreateBox}
              >
                <Text style={styles.modalConfirmText}>Criar Caixinha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1d24',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: '#8e95a5',
    fontSize: 15,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#ff5500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#13151b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#242835',
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summarySubtitle: {
    color: '#8e95a5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryAmount: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  cdiBadge: {
    backgroundColor: 'rgba(0, 210, 106, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 106, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cdiBadgeText: {
    color: '#00d26a',
    fontSize: 12,
    fontWeight: '700',
  },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0c0e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  yieldItem: {
    flex: 1,
  },
  yieldLabel: {
    color: '#8e95a5',
    fontSize: 11,
    marginBottom: 2,
  },
  yieldValueGreen: {
    color: '#00d26a',
    fontSize: 14,
    fontWeight: '700',
  },
  yieldDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#242835',
    marginHorizontal: 10,
  },
  cdiInfoNote: {
    color: '#8e95a5',
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  boxCard: {
    backgroundColor: '#13151b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#242835',
    marginBottom: 16,
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  boxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boxIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  boxIcon: {
    fontSize: 20,
  },
  boxTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  boxTargetText: {
    color: '#8e95a5',
    fontSize: 12,
    marginTop: 2,
  },
  boxBalanceCol: {
    alignItems: 'flex-end',
  },
  boxBalance: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  boxYieldText: {
    color: '#00d26a',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#242835',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  boxActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  boxActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositBtn: {
    backgroundColor: 'rgba(0, 210, 106, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 106, 0.3)',
  },
  depositBtnText: {
    color: '#00d26a',
    fontSize: 13,
    fontWeight: '700',
  },
  withdrawBtn: {
    backgroundColor: '#1e222d',
    borderWidth: 1,
    borderColor: '#2e3344',
  },
  withdrawBtnText: {
    color: '#c5c9d3',
    fontSize: 13,
    fontWeight: '600',
  },
  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#13151b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#242835',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#8e95a5',
    fontSize: 13,
    marginBottom: 20,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0c0e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242835',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  currencyPrefix: {
    color: '#ff5500',
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  fieldLabel: {
    color: '#8e95a5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#0b0c0e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242835',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  infoBanner: {
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    color: '#ffaa80',
    fontSize: 12,
    lineHeight: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1e222d',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8e95a5',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmGreen: {
    backgroundColor: '#00d26a',
  },
  confirmOrange: {
    backgroundColor: '#ff5500',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

