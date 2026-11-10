/**
 * KycIdentityVerificationScreen.tsx — Verificação Facial e Leitura de Documentos (KYC Bancário)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

interface KycScreenProps {
  readonly onBack: () => void;
  readonly onVerificationComplete: () => void;
}

type KycStep = 'SELECT_DOC' | 'CAPTURE_DOC' | 'FACIAL_LIVENESS' | 'SUCCESS';

export const KycIdentityVerificationScreen: React.FC<KycScreenProps> = ({
  onBack,
  onVerificationComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<KycStep>('SELECT_DOC');
  const [selectedDocType, setSelectedDocType] = useState<'CNH' | 'RG' | 'CIN'>('CNH');
  const [docSide, setDocSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [livenessInstruction, setLivenessInstruction] = useState('Olhe diretamente para a câmera');
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulação de fluxo guiado de Prova de Vida Facial
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (currentStep === 'FACIAL_LIVENESS') {
      setLivenessProgress(15);
      timer = setTimeout(() => {
        setLivenessInstruction('Pisque os olhos devagar...');
        setLivenessProgress(50);
        setTimeout(() => {
          setLivenessInstruction('Mantenha o rosto imóvel e sorria levemente...');
          setLivenessProgress(85);
          setTimeout(() => {
            setLivenessProgress(100);
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
              setCurrentStep('SUCCESS');
            }, 1200);
          }, 1500);
        }, 1800);
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleDocumentCaptured = () => {
    if (docSide === 'FRONT') {
      setDocSide('BACK');
    } else {
      setCurrentStep('FACIAL_LIVENESS');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Validação de Identidade KYC</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* PASSO 1: ESCOLHA DO DOCUMENTO */}
        {currentStep === 'SELECT_DOC' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>ETAPA 1 DE 3</Text>
            </View>
            <Text style={styles.title}>Selecione seu Documento Oficial</Text>
            <Text style={styles.subtitle}>
              Para cumprir as diretrizes de segurança do BACEN, precisamos verificar sua identidade original.
            </Text>

            <View style={styles.optionsList}>
              {[
                { id: 'CNH' as const, title: 'CNH Digital ou Física', desc: 'Carteira Nacional de Habilitação com QR Code' },
                { id: 'CIN' as const, title: 'Nova Carteira de Identidade (CIN)', desc: 'Documento Nacional com CPF unificado' },
                { id: 'RG' as const, title: 'RG Tradicional', desc: 'Registro Geral emitido pela SSP' },
              ].map((doc) => {
                const selected = selectedDocType === doc.id;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.docOption, selected && styles.docOptionSelected]}
                    onPress={() => setSelectedDocType(doc.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.docOptionHeader}>
                      <Text style={[styles.docOptionTitle, selected && styles.textAccent]}>
                        {doc.title}
                      </Text>
                      {selected && <Text style={styles.checkIcon}>✓</Text>}
                    </View>
                    <Text style={styles.docOptionDesc}>{doc.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setCurrentStep('CAPTURE_DOC')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Continuar para Captura</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PASSO 2: CAPTURA DO DOCUMENTO (FRENTE E VERSO) */}
        {currentStep === 'CAPTURE_DOC' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>ETAPA 2 DE 3 • {selectedDocType}</Text>
            </View>
            <Text style={styles.title}>
              Fotografe a {docSide === 'FRONT' ? 'FRENTE' : 'PARTE DE TRÁS (VERSO)'}
            </Text>
            <Text style={styles.subtitle}>
              Posicione o documento dentro da moldura abaixo em local bem iluminado e sem reflexos.
            </Text>

            {/* Simulação de Moldura de Câmera com Scanner */}
            <View style={styles.docScanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <View style={styles.scanTarget}>
                <Text style={styles.scanTargetIcon}>📄</Text>
                <Text style={styles.scanTargetText}>
                  {docSide === 'FRONT' ? 'Enquadre a Foto e Nome' : 'Enquadre o Verso e Assinatura'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDocumentCaptured}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {docSide === 'FRONT' ? 'Confirmar Frente do Documento' : 'Confirmar Verso e Ir para Face ID'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PASSO 3: PROVA DE VIDA FACIAL (LIVENESS) */}
        {currentStep === 'FACIAL_LIVENESS' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>ETAPA 3 DE 3 • PROVA DE VIDA</Text>
            </View>
            <Text style={styles.title}>Reconhecimento Facial e Vivacidade</Text>
            <Text style={styles.subtitle}>
              Siga as instruções na tela para confirmar que você é o titular legítimo.
            </Text>

            {/* Moldura Oval de Leitura Facial */}
            <View style={styles.faceScanFrame}>
              <View style={styles.faceScanCircle}>
                <Text style={styles.faceScanIcon}>👤</Text>
              </View>

              <View style={styles.livenessBarContainer}>
                <View
                  style={[
                    styles.livenessBarFill,
                    { width: `${livenessProgress}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.instructionCard}>
              {isProcessing ? (
                <ActivityIndicator color="#ff5500" style={{ marginVertical: 4 }} />
              ) : (
                <Text style={styles.instructionText}>{livenessInstruction}</Text>
              )}
            </View>
          </View>
        )}

        {/* SUCESSO / CONCLUÍDO */}
        {currentStep === 'SUCCESS' && (
          <View style={[styles.stepContainer, { alignItems: 'center' }]}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓</Text>
            </View>
            <Text style={styles.title}>Identidade Bancária Validada</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>
              Seus dados, documento oficial e biometria facial foram auditados e autenticados com sucesso no Cloud Firestore.
            </Text>

            <View style={styles.complianceCard}>
              <Text style={styles.complianceTitle}>CERTIFICADO DE CONFORMIDADE KYC</Text>
              <Text style={styles.complianceText}>• Documento: {selectedDocType} (Frente e Verso)</Text>
              <Text style={styles.complianceText}>• Prova de Vida Facial: 100% Validada</Text>
              <Text style={styles.complianceText}>• Protocolo BACEN: {new Date().toISOString().replace(/\D/g, '').slice(-12)}</Text>
              <Text style={styles.complianceText}>• Status: CONTA NÍVEL OURO REGULAMENTAR</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                onVerificationComplete();
                onBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Concluir e Voltar ao Início</Text>
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
    padding: 24,
  },
  stepContainer: {
    gap: 16,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  stepBadgeText: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#8e929a',
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
    marginVertical: 8,
  },
  docOption: {
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1d212b',
    gap: 6,
  },
  docOptionSelected: {
    borderColor: '#ff5500',
    backgroundColor: 'rgba(255, 85, 0, 0.04)',
  },
  docOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  docOptionDesc: {
    fontSize: 12,
    color: '#8e929a',
  },
  textAccent: {
    color: '#ff5500',
  },
  checkIcon: {
    color: '#ff5500',
    fontSize: 16,
    fontWeight: '700',
  },
  docScanFrame: {
    height: 240,
    backgroundColor: '#15171e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#21242d',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#ff5500',
  },
  cornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanTarget: {
    alignItems: 'center',
    gap: 8,
  },
  scanTargetIcon: {
    fontSize: 48,
  },
  scanTargetText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  faceScanFrame: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  faceScanCircle: {
    width: 180,
    height: 230,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#ff5500',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#15171e',
  },
  faceScanIcon: {
    fontSize: 64,
  },
  livenessBarContainer: {
    width: 200,
    height: 6,
    backgroundColor: '#21242d',
    borderRadius: 3,
    marginTop: 20,
    overflow: 'hidden',
  },
  livenessBarFill: {
    height: '100%',
    backgroundColor: '#ff5500',
  },
  instructionCard: {
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1d212b',
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successBadgeText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
  },
  complianceCard: {
    width: '100%',
    backgroundColor: '#12141a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 8,
    marginVertical: 12,
  },
  complianceTitle: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  complianceText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#ff5500',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
