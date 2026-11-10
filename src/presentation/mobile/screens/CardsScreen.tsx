/**
 * CardsScreen.tsx — Gestão de Cartões de Crédito/Débito e Faturas (Padrão Nubank/Inter)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';

interface CardsScreenProps {
  readonly onBack: () => void;
  readonly onPayWithPix: () => void;
}

export const CardsScreen: React.FC<CardsScreenProps> = ({
  onBack,
  onPayWithPix,
}) => {
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const totalLimit = 15000.0;
  const usedAmount = 2450.8;
  const availableLimit = totalLimit - usedAmount;
  const limitUsagePercent = (usedAmount / totalLimit) * 100;

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleToggleCardLock = () => {
    const nextState = !isCardLocked;
    setIsCardLocked(nextState);
    Alert.alert(
      nextState ? 'Cartão Bloqueado' : 'Cartão Desbloqueado',
      nextState
        ? 'Seu cartão virtual foi bloqueado temporariamente para compras online e físicas.'
        : 'Seu cartão virtual está liberado e ativo para transações.',
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Cartões e Faturas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Cartão Virtual Interativo */}
        <View style={[styles.virtualCard, isCardLocked && styles.virtualCardLocked]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardBrand}>NEXO PLATINUM</Text>
            <Text style={styles.cardTypeBadge}>VIRTUAL</Text>
          </View>

          <View style={styles.cardChipRow}>
            <View style={styles.cardChip}>
              <View style={styles.chipInner} />
            </View>
            <Text style={styles.contactlessIcon}>))))</Text>
          </View>

          <View style={styles.cardNumberContainer}>
            <Text style={styles.cardNumber}>
              {showSensitiveData ? '4532  8912  3456  7890' : '••••  ••••  ••••  7890'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardHolderLabel}>TITULAR</Text>
              <Text style={styles.cardHolderName}>GUILHERME RIBEIRO</Text>
            </View>
            <View style={styles.cardExpRow}>
              <View>
                <Text style={styles.cardHolderLabel}>VALIDADE</Text>
                <Text style={styles.cardExpValue}>
                  {showSensitiveData ? '11/31' : '••/••'}
                </Text>
              </View>
              <View>
                <Text style={styles.cardHolderLabel}>CVV</Text>
                <Text style={styles.cardExpValue}>
                  {showSensitiveData ? '842' : '•••'}
                </Text>
              </View>
            </View>
          </View>

          {isCardLocked && (
            <View style={styles.lockedOverlay}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedText}>CARTÃO BLOQUEADO</Text>
            </View>
          )}
        </View>

        {/* Botão de Revelar Dados Sensíveis */}
        <TouchableOpacity
          style={styles.revealButton}
          onPress={() => setShowSensitiveData((prev) => !prev)}
        >
          <Text style={styles.revealButtonText}>
            {showSensitiveData ? 'Ocultar Dados Sensíveis' : 'Ver Dados do Cartão (CVV e Validade)'}
          </Text>
        </TouchableOpacity>

        {/* Resumo da Fatura Atual */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceTag}>FATURA ATUAL (ABERTA)</Text>
              <Text style={styles.invoiceAmount}>{formatCurrency(usedAmount)}</Text>
            </View>
            <View style={styles.invoiceDueDateBadge}>
              <Text style={styles.dueDateText}>Vence em 15/12</Text>
            </View>
          </View>

          {/* Barra de Progresso do Limite */}
          <View style={styles.limitBarSection}>
            <View style={styles.limitBarTrack}>
              <View
                style={[
                  styles.limitBarFill,
                  { width: `${Math.min(limitUsagePercent, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.limitLabelsRow}>
              <Text style={styles.limitLabel}>
                Disponível: <Text style={styles.textGreen}>{formatCurrency(availableLimit)}</Text>
              </Text>
              <Text style={styles.limitLabel}>
                Limite Total: {formatCurrency(totalLimit)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.payInvoiceButton}
            onPress={onPayWithPix}
            activeOpacity={0.8}
          >
            <Text style={styles.payInvoiceButtonText}>Pagar Fatura com PIX</Text>
          </TouchableOpacity>
        </View>

        {/* Controles de Segurança do Cartão */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>CONFIGURAÇÕES DO CARTÃO</Text>

          <TouchableOpacity
            style={styles.controlRow}
            onPress={handleToggleCardLock}
            activeOpacity={0.7}
          >
            <View style={styles.controlLeft}>
              <Text style={styles.controlIcon}>{isCardLocked ? '🔓' : '🔒'}</Text>
              <View>
                <Text style={styles.controlTitle}>
                  {isCardLocked ? 'Desbloquear Cartão' : 'Bloqueio Temporário'}
                </Text>
                <Text style={styles.controlSubtitle}>
                  {isCardLocked
                    ? 'Toque para liberar o uso do cartão virtual'
                    : 'Bloqueie seu cartão com 1 toque contra fraudes'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.togglePill,
                isCardLocked ? styles.togglePillActive : styles.togglePillInactive,
              ]}
            >
              <Text style={styles.togglePillText}>
                {isCardLocked ? 'ATIVO' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.controlRow}
            onPress={() =>
              Alert.alert(
                'Ajuste de Limite',
                'O limite do seu cartão de crédito pode ser readequado de acordo com seu score e movimentação Open Finance.',
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.controlLeft}>
              <Text style={styles.controlIcon}>⚙️</Text>
              <View>
                <Text style={styles.controlTitle}>Ajustar Limite do Cartão</Text>
                <Text style={styles.controlSubtitle}>
                  Defina um teto mensal menor para controlar gastos
                </Text>
              </View>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
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
  content: {
    padding: 20,
    gap: 18,
  },
  virtualCard: {
    height: 210,
    backgroundColor: '#161820',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 85, 0, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  virtualCardLocked: {
    borderColor: '#374151',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  cardTypeBadge: {
    color: '#ff5500',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardChip: {
    width: 38,
    height: 28,
    backgroundColor: '#d97706',
    borderRadius: 6,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: '80%',
    height: '70%',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 3,
  },
  contactlessIcon: {
    color: '#9ca3af',
    fontSize: 14,
    transform: [{ rotate: '90deg' }],
  },
  cardNumberContainer: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderLabel: {
    color: '#6b7280',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardHolderName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardExpRow: {
    flexDirection: 'row',
    gap: 14,
  },
  cardExpValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 12, 14, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  lockedIcon: {
    fontSize: 32,
  },
  lockedText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  revealButton: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  revealButtonText: {
    color: '#ff5500',
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceCard: {
    backgroundColor: '#12141a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceTag: {
    color: '#8e929a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  invoiceAmount: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  invoiceDueDateBadge: {
    backgroundColor: 'rgba(255, 85, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dueDateText: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
  },
  limitBarSection: {
    gap: 8,
  },
  limitBarTrack: {
    height: 8,
    backgroundColor: '#1f242e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    backgroundColor: '#ff5500',
    borderRadius: 4,
  },
  limitLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  limitLabel: {
    color: '#8e929a',
    fontSize: 11,
  },
  textGreen: {
    color: '#10b981',
    fontWeight: '700',
  },
  payInvoiceButton: {
    backgroundColor: '#ff5500',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payInvoiceButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  controlsSection: {
    backgroundColor: '#12141a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 14,
  },
  sectionTitle: {
    color: '#8e929a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  controlSubtitle: {
    color: '#8e929a',
    fontSize: 11,
    lineHeight: 15,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  togglePillActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  togglePillInactive: {
    backgroundColor: '#1c202a',
  },
  togglePillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#1d212b',
  },
  arrowText: {
    color: '#ff5500',
    fontSize: 16,
    fontWeight: '700',
  },
});

