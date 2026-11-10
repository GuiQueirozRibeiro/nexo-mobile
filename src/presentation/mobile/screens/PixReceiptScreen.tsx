/**
 * PixReceiptScreen.tsx — Comprovante Bancário Oficial de Transferência PIX
 *
 * Padrão BACEN / SPI (Sistema de Pagamentos Instantâneos):
 * - Exibição de autenticação bancária digital única (EndToEndId).
 * - Identificação completa do pagador e recebedor.
 * - Compartilhamento nativo formatado via WhatsApp, AirDrop, E-mail ou exportação.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Share,
} from 'react-native';

export interface PixReceiptData {
  readonly transferId: string;
  readonly endToEndId: string;
  readonly amount: number;
  readonly recipientName: string;
  readonly recipientKey: string;
  readonly recipientBank?: string;
  readonly payerName: string;
  readonly timestampIso: string;
  readonly description?: string;
}

interface PixReceiptScreenProps {
  readonly receipt: PixReceiptData;
  readonly onClose: () => void;
}

export const PixReceiptScreen: React.FC<PixReceiptScreenProps> = ({
  receipt,
  onClose,
}) => {
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formattedDate = new Date(receipt.timestampIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleShareReceipt = async () => {
    try {
      const shareMessage = [
        '========================================',
        '       COMPROVANTE DE TRANSFERÊNCIA PIX',
        '               NEXO FINANCE            ',
        '========================================',
        `Valor: ${formatCurrency(receipt.amount)}`,
        `Data/Hora: ${formattedDate}`,
        '----------------------------------------',
        'DESTINATÁRIO:',
        `Nome: ${receipt.recipientName}`,
        `Chave: ${receipt.recipientKey}`,
        `Instituição: ${receipt.recipientBank ?? 'Banco do Destinatário'}`,
        '----------------------------------------',
        'PAGADOR:',
        `Nome: ${receipt.payerName}`,
        'Instituição: Nexo Pagamentos S.A. (Asaas BaaS)',
        '----------------------------------------',
        'AUTENTICAÇÃO BACEN SPI:',
        `ID Transação: ${receipt.transferId}`,
        `ID Fim a Fim (E2E): ${receipt.endToEndId}`,
        '========================================',
        'Comprovante emitido via Nexo Finance Mobile',
      ].join('\n');

      await Share.share({
        message: shareMessage,
        title: `Comprovante PIX - ${formatCurrency(receipt.amount)}`,
      });
    } catch {
      // Ignora cancelamento de compartilhamento
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho do Recibo */}
        <View style={styles.receiptCard}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COMPROVANTE OFICIAL</Text>
            </View>
            <Text style={styles.brandTitle}>NEXO BANK</Text>
          </View>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>VALOR TRANSFERIDO</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(receipt.amount)}
            </Text>
            <View style={styles.settledBadge}>
              <Text style={styles.settledIcon}>✓</Text>
              <Text style={styles.settledText}>Liquidado pelo BACEN</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Dados do Destinatário */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DESTINATÁRIO</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Nome</Text>
              <Text style={styles.fieldValue}>{receipt.recipientName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Chave PIX</Text>
              <Text style={styles.fieldValue}>{receipt.recipientKey}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Instituição</Text>
              <Text style={styles.fieldValue}>
                {receipt.recipientBank ?? 'Instituição Autorizada BACEN'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Dados do Pagador */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ORIGEM DO PAGAMENTO</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Pagador</Text>
              <Text style={styles.fieldValue}>{receipt.payerName}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Instituição</Text>
              <Text style={styles.fieldValue}>Nexo Conta Digital (Asaas BaaS)</Text>
            </View>
            {receipt.description && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Descrição</Text>
                <Text style={styles.fieldValue}>{receipt.description}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Autenticação BACEN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AUTENTICAÇÃO ELETRÔNICA</Text>
            <View style={styles.fieldRowStacked}>
              <Text style={styles.fieldLabel}>ID da Transação</Text>
              <Text style={styles.monoValue}>{receipt.transferId}</Text>
            </View>
            <View style={styles.fieldRowStacked}>
              <Text style={styles.fieldLabel}>Identificador Fim a Fim (E2E ID)</Text>
              <Text style={styles.monoValue}>{receipt.endToEndId}</Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Data e Hora</Text>
              <Text style={styles.fieldValue}>{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => void handleShareReceipt()}
            activeOpacity={0.8}
          >
            <Text style={styles.shareButtonIcon}>📤</Text>
            <Text style={styles.shareButtonText}>Compartilhar Comprovante (PDF)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Fechar e Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0d',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  receiptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ff5500',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  amountBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  amountValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settledIcon: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  settledText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  fieldRowStacked: {
    gap: 4,
  },
  fieldLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  fieldValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  monoValue: {
    color: '#d1d5db',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 6,
    borderRadius: 8,
  },
  buttonGroup: {
    marginTop: 24,
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#ff5500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
  },
  shareButtonIcon: {
    fontSize: 16,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
  },
});
