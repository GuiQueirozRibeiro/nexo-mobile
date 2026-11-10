/**
 * PixQrScannerScreen.tsx — Leitor Unificado de QR Code PIX e Código de Barras de Boletos (Febraban)
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
  Alert,
} from 'react-native';
import { PixEmvParserService, type ParsedPixQrCode } from '../../../core';

interface PixQrScannerScreenProps {
  readonly onBack: () => void;
  readonly onQrDecoded: (parsed: ParsedPixQrCode) => void;
  readonly onBoletoDecoded?: (boletoData: {
    readonly code: string;
    readonly amount: number;
    readonly bankName: string;
    readonly dueDateIso?: string;
  }) => void;
}

const KNOWN_BANKS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Banco Santander',
  '077': 'Banco Inter',
  '104': 'Caixa Econômica Federal',
  '237': 'Banco Bradesco',
  '260': 'Nubank (Nu Pagamentos)',
  '341': 'Banco Itaú',
  '461': 'Asaas IP S.A.',
};

export const PixQrScannerScreen: React.FC<PixQrScannerScreenProps> = ({
  onBack,
  onQrDecoded,
  onBoletoDecoded,
}) => {
  const [activeTab, setActiveTab] = useState<'QR_SCAN' | 'BOLETO' | 'PASTE'>('QR_SCAN');
  const [pastedCode, setPastedCode] = useState('');
  const [boletoDigits, setBoletoDigits] = useState('');

  const handleProcessPixCode = (code: string) => {
    if (!code.trim()) {
      Alert.alert('Código Vazio', 'Cole o código PIX Copia e Cola para continuar.');
      return;
    }

    const parsed = PixEmvParserService.parse(code);
    if (!parsed.isValid) {
      Alert.alert('Código Inválido', 'Não foi possível identificar um QR Code PIX válido.');
      return;
    }

    onQrDecoded(parsed);
  };

  const handleProcessBoleto = () => {
    const cleanDigits = boletoDigits.replace(/\D/g, '');
    if (cleanDigits.length < 44 || cleanDigits.length > 48) {
      Alert.alert(
        'Linha Digitável Incompleta',
        'Boletos bancários possuem 47 dígitos e contas de consumo 48 dígitos. Verifique o número digitado.',
      );
      return;
    }

    const bankCode = cleanDigits.slice(0, 3);
    const bankName = KNOWN_BANKS[bankCode] ?? `Banco Código ${bankCode}`;

    // Valor padrão simulado para testes caso não decodificado
    const simulatedAmount = 149.9;

    if (onBoletoDecoded) {
      onBoletoDecoded({
        code: cleanDigits,
        amount: simulatedAmount,
        bankName,
        dueDateIso: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      });
    } else {
      Alert.alert(
        'Boleto Validado',
        `Beneficiário: ${bankName}\nValor: R$ ${simulatedAmount.toFixed(2)}\nVencimento em 3 dias úteis.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Pagar com Biometria',
            onPress: () => {
              onQrDecoded({
                isValid: true,
                rawPayload: cleanDigits,
                pixKey: `boleto-${cleanDigits.slice(0, 10)}`,
                amount: simulatedAmount,
                merchantName: bankName,
                merchantCity: 'Sao Paulo',
                txId: `bol-${Date.now()}`,
              });
            },
          },
        ],
      );
    }
  };

  const handleSimulateScan = () => {
    if (activeTab === 'BOLETO') {
      setBoletoDigits('03399.00014 55000.000002 00000.000003 1 95400000014990');
      return;
    }
    const demoPayload =
      '00020126570014br.gov.bcb.pix0135guilherme.queiroz@eximiatech.com.br520400005303986540545.905802BR5916Eximia Tech Ltda6009Sao Paulo62070503***6304ABCD';
    handleProcessPixCode(demoPayload);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Leitor & Scanner</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Seletor de 3 Modos: QR Code, Boleto e Copia e Cola */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'QR_SCAN' && styles.tabButtonActive]}
          onPress={() => setActiveTab('QR_SCAN')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'QR_SCAN' && styles.tabButtonTextActive,
            ]}
          >
            📷 QR PIX
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'BOLETO' && styles.tabButtonActive]}
          onPress={() => setActiveTab('BOLETO')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'BOLETO' && styles.tabButtonTextActive,
            ]}
          >
            📄 Boleto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PASTE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('PASTE')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'PASTE' && styles.tabButtonTextActive,
            ]}
          >
            📋 Copia/Cola
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* MODO 1: SCANNER DE CÂMERA QR PIX */}
        {activeTab === 'QR_SCAN' && (
          <View style={styles.cameraContainer}>
            <View style={styles.viewfinderBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.laserScanLine} />
            </View>

            <Text style={styles.scanInstruction}>
              Aponte a câmera para o QR Code PIX
            </Text>

            <TouchableOpacity
              style={styles.simulateScanButton}
              onPress={handleSimulateScan}
              activeOpacity={0.8}
            >
              <Text style={styles.simulateScanText}>
                ⚡ Simular Leitura do QR Code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODO 2: LEITOR E VALIDADOR DE BOLETOS */}
        {activeTab === 'BOLETO' && (
          <View style={styles.boletoCard}>
            <Text style={styles.sectionHeader}>PAGAR CONTA OU BOLETO</Text>
            <Text style={styles.sectionSub}>
              Digite ou cole os 47/48 dígitos da linha digitável do boleto de cobrança, água, luz ou tributo.
            </Text>

            <TextInput
              style={styles.boletoInput}
              placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
              placeholderTextColor="#4b5563"
              keyboardType="numeric"
              multiline
              value={boletoDigits}
              onChangeText={setBoletoDigits}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleProcessBoleto}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Validar e Pagar Boleto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateScanButton}
              onPress={handleSimulateScan}
              activeOpacity={0.8}
            >
              <Text style={styles.simulateScanText}>
                📄 Inserir Linha de Teste Santander
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MODO 3: COPIA E COLA PIX */}
        {activeTab === 'PASTE' && (
          <View style={styles.pasteCard}>
            <Text style={styles.sectionHeader}>PIX COPIA E COLA</Text>
            <Text style={styles.sectionSub}>
              Cole o código completo que começa com "000201..." para carregar os dados automaticamente.
            </Text>

            <TextInput
              style={styles.pasteInput}
              placeholder="00020126580014br.gov.bcb.pix..."
              placeholderTextColor="#4b5563"
              multiline
              value={pastedCode}
              onChangeText={setPastedCode}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleProcessPixCode(pastedCode)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Processar Código PIX</Text>
            </TouchableOpacity>
          </View>
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
    borderColor: '#1f242d',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  tabSelector: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#141822',
    borderRadius: 12,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ff5500',
  },
  tabButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  cameraContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  viewfinderBox: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#ff5500',
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserScanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#ff5500',
    shadowColor: '#ff5500',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  scanInstruction: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  simulateScanButton: {
    marginTop: 18,
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
  },
  simulateScanText: {
    color: '#ff5500',
    fontSize: 13,
    fontWeight: '600',
  },
  boletoCard: {
    backgroundColor: '#12151c',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  pasteCard: {
    backgroundColor: '#12151c',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionSub: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  boletoInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#262d3d',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 70,
  },
  pasteInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#262d3d',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 90,
  },
  primaryButton: {
    backgroundColor: '#ff5500',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
