/**
 * PixQrScannerScreen.tsx — Leitor de Câmera e Copia e Cola para QR Code PIX
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
}

export const PixQrScannerScreen: React.FC<PixQrScannerScreenProps> = ({
  onBack,
  onQrDecoded,
}) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'PASTE'>('CAMERA');
  const [pastedCode, setPastedCode] = useState('');

  const handleProcessCode = (code: string) => {
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

  // Simulação de scan pela câmera com um clique no visor
  const handleSimulateScan = () => {
    // Exemplo de payload BR Code oficial do Asaas
    const demoPayload = '00020126570014br.gov.bcb.pix0135guilherme.queiroz@eximiatech.com.br520400005303986540545.905802BR5916Eximia Tech Ltda6009Sao Paulo62070503***6304ABCD';
    handleProcessCode(demoPayload);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Pagar com QR Code</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Seletor de Modo: Câmera vs Copia e Cola */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CAMERA' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CAMERA')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'CAMERA' && styles.tabButtonTextActive,
            ]}
          >
            📷 Câmera (Scan)
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
            📋 Copia e Cola
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'CAMERA' ? (
        <View style={styles.cameraContainer}>
          <Text style={styles.instructionText}>
            Aponte a câmera para o QR Code na tela ou maquininha
          </Text>

          {/* Mira do Scanner */}
          <TouchableOpacity
            style={styles.scannerTarget}
            onPress={handleSimulateScan}
            activeOpacity={0.9}
          >
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            <View style={styles.scanLaser} />

            <Text style={styles.tapToScanText}>Toque aqui para escanear demo</Text>
          </TouchableOpacity>

          <View style={styles.cameraFooter}>
            <Text style={styles.cameraFooterText}>
              Compatível com qualquer banco e maquininha autorizada pelo BACEN
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pasteContainer}>
          <Text style={styles.pasteTitle}>Cole o código PIX Copia e Cola</Text>
          <Text style={styles.pasteSubtitle}>
            Copie o código gerado pelo estabelecimento ou conta de consumo e cole abaixo.
          </Text>

          <TextInput
            style={styles.pasteInput}
            multiline
            numberOfLines={4}
            placeholder="Cole o código aqui (000201...)"
            placeholderTextColor="#6b7280"
            value={pastedCode}
            onChangeText={setPastedCode}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              !pastedCode.trim() && styles.primaryButtonDisabled,
            ]}
            onPress={() => handleProcessCode(pastedCode)}
            disabled={!pastedCode.trim()}
          >
            <Text style={styles.primaryButtonText}>Continuar para Pagamento</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  tabSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#12141a',
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    borderColor: '#ff5500',
  },
  tabButtonText: {
    color: '#8e929a',
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#ff5500',
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  scannerTarget: {
    width: 260,
    height: 260,
    borderRadius: 24,
    backgroundColor: '#15171e',
    borderWidth: 1,
    borderColor: '#21242d',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#ff5500',
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLaser: {
    width: '80%',
    height: 2,
    backgroundColor: '#ff5500',
    shadowColor: '#ff5500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    marginBottom: 16,
  },
  tapToScanText: {
    color: '#8e929a',
    fontSize: 11,
    marginTop: 8,
  },
  cameraFooter: {
    paddingHorizontal: 24,
  },
  cameraFooterText: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
  },
  pasteContainer: {
    padding: 24,
    gap: 16,
  },
  pasteTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  pasteSubtitle: {
    color: '#8e929a',
    fontSize: 12,
    lineHeight: 16,
  },
  pasteInput: {
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 16,
    color: '#ffffff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1d212b',
    height: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#ff5500',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
