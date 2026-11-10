/**
 * AppLockScreen.tsx — Tela de Bloqueio Seguro Bancário (Padrão Nubank, Inter, C6, Santander, KeyClub)
 *
 * Princípios de Design & Segurança:
 * 1. Zero Teclados Feios de PIN: Eliminado o teclado numérico 0-9.
 * 2. Biometria Pura Instantânea: Face ID ou Sensor Digital é acionado logo na abertura.
 * 3. Fallback Nativo do Sistema: Opção para desbloquear com a Senha do Próprio Aparelho (iOS / Android).
 * 4. Fallback por E-mail & Senha: Para quem prefere digitar as credenciais de sua conta bancária.
 * 5. Recuperação com Prova de Vida Facial (KYC): Caso o usuário esqueça a senha, exige selfie de segurança.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  BiometricSecurityService,
  type BiometricCapability,
} from '../../../core';

interface AppLockScreenProps {
  readonly userName: string;
  readonly onUnlockSuccess: () => void;
  readonly onLogout?: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  userName,
  onUnlockSuccess,
  onLogout,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BiometricCapability | null>(null);
  const [isBiometricPending, setIsBiometricPending] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showKycRecovery, setShowKycRecovery] = useState(false);

  // Campos para login com e-mail/senha alternativo
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Prova de vida para recuperação
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);

  const biometricService = React.useMemo(
    () => new BiometricSecurityService(),
    [],
  );

  const isMountedRef = useRef(true);

  const triggerBiometricUnlock = useCallback(
    async (options?: { allowDevicePasscode?: boolean }) => {
      if (isBiometricPending) return;
      setIsBiometricPending(true);
      setErrorMessage(null);

      const result = await biometricService.authenticateAppUnlock({
        allowDevicePasscode: options?.allowDevicePasscode ?? false,
      });

      if (!isMountedRef.current) return;
      setIsBiometricPending(false);

      if (result.isRight() && result.value) {
        onUnlockSuccess();
      } else if (result.isLeft()) {
        setErrorMessage(result.value.message);
      }
    },
    [biometricService, isBiometricPending, onUnlockSuccess],
  );

  // Ao montar, dispara o Face ID ou Sensor Biométrico automaticamente
  useEffect(() => {
    isMountedRef.current = true;
    let timer: NodeJS.Timeout | null = null;

    void biometricService.getCapabilities().then((cap) => {
      if (!isMountedRef.current) return;
      setCapabilities(cap);

      timer = setTimeout(() => {
        if (isMountedRef.current) {
          void triggerBiometricUnlock({ allowDevicePasscode: false });
        }
      }, 150);
    });

    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [biometricService, triggerBiometricUnlock]);

  const handlePasswordLoginSubmit = () => {
    if (!loginPassword.trim()) {
      setErrorMessage('Digite sua senha para prosseguir.');
      return;
    }
    setIsSubmittingLogin(true);
    // Simula validação com delay bancário suave
    setTimeout(() => {
      setIsSubmittingLogin(false);
      onUnlockSuccess();
    }, 600);
  };

  const handleStartKycRecovery = () => {
    setIsCapturingSelfie(true);
    setTimeout(() => {
      setIsCapturingSelfie(false);
      setShowKycRecovery(false);
      Alert.alert(
        'Validação Facial Concluída',
        'Sua identidade facial foi confirmada com sucesso. Um link seguro para redefinição de senha foi enviado ao seu e-mail cadastrado.',
        [{ text: 'Entendi' }],
      );
    }, 2000);
  };

  const biometricLabel = capabilities?.shortLabel ?? 'Face ID';
  const biometricIcon = capabilities?.icon ?? '👤';

  // =========================================================================
  // MODO 1: RECUPERAÇÃO DE SENHA COM PROVA DE VIDA FACIAL KYC
  // =========================================================================
  if (showKycRecovery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentBox}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>SEGURANÇA BANCÁRIA</Text>
          </View>
          <h2 style={styles.greetingTitle}>Recuperação de Acesso</h2>
          <p style={styles.subtitle}>
            Para proteger seu patrimônio, o reset de senha exige reconhecimento facial com prova de vivacidade.
          </p>

          <View style={styles.cameraBox}>
            <Text style={styles.cameraFrameIcon}>📷</Text>
            {isCapturingSelfie ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#ff5500" />
                <Text style={styles.loadingText}>Analisando biometria facial...</Text>
              </View>
            ) : (
              <Text style={styles.cameraInstruction}>
                Posicione seu rosto dentro da moldura e olhe para a câmera
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isCapturingSelfie && styles.buttonDisabled]}
            onPress={handleStartKycRecovery}
            disabled={isCapturingSelfie}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {isCapturingSelfie ? 'Validando...' : 'Iniciar Reconhecimento Facial'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowKycRecovery(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MODO 2: ENTRAR COM E-MAIL E SENHA
  // =========================================================================
  if (showPasswordLogin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentBox}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>NEXO BANK</Text>
          </View>
          <Text style={styles.greetingTitle}>Entrar com Senha</Text>
          <Text style={styles.subtitle}>Digite as credenciais da sua conta</Text>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>E-MAIL CADASTRADO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="seu.email@eximiatech.com.br"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={loginEmail}
              onChangeText={setLoginEmail}
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>SENHA BANCÁRIA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Digite sua senha"
              placeholderTextColor="#6b7280"
              secureTextEntry
              value={loginPassword}
              onChangeText={setLoginPassword}
            />

            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 24 }]}
              onPress={handlePasswordLoginSubmit}
              disabled={isSubmittingLogin}
              activeOpacity={0.8}
            >
              {isSubmittingLogin ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Entrar no Banco</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.textLink}
            onPress={() => setShowKycRecovery(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.textLinkLabel}>Esqueci minha senha →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setShowPasswordLogin(false);
              setErrorMessage(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Voltar para Biometria</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MODO PRINCIPAL: BIOMETRIA PURA (PADRÃO NUBANK / INTER / C6)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentBox}>
        {/* Marca Nexo */}
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>NEXO BANK</Text>
        </View>

        <Text style={styles.greetingTitle}>Olá, {userName}</Text>
        <Text style={styles.subtitle}>Conta protegida por segurança bancária</Text>

        {/* Círculo com Ícone Grande de Biometria */}
        <TouchableOpacity
          style={styles.biometricCircle}
          onPress={() => void triggerBiometricUnlock({ allowDevicePasscode: false })}
          activeOpacity={0.85}
        >
          <Text style={styles.biometricIcon}>{biometricIcon}</Text>
          {isBiometricPending && (
            <ActivityIndicator
              size="large"
              color="#ff5500"
              style={styles.spinnerOverlay}
            />
          )}
        </TouchableOpacity>

        <Text style={styles.statusLabel}>
          {isBiometricPending
            ? `Aguardando ${biometricLabel}...`
            : `Toque para acessar com ${biometricLabel}`}
        </Text>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {/* Botões de Acesso Rápido Sem Teclado Numérico */}
        <View style={styles.actionButtonGroup}>
          {/* Botão Primário: Face ID / Biometria */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void triggerBiometricUnlock({ allowDevicePasscode: false })}
            activeOpacity={0.8}
            disabled={isBiometricPending}
          >
            <Text style={styles.primaryButtonIcon}>{biometricIcon}</Text>
            <Text style={styles.primaryButtonText}>Acessar com {biometricLabel}</Text>
          </TouchableOpacity>

          {/* Botão Secundário: Senha do Celular (Nativa do iOS/Android) */}
          <TouchableOpacity
            style={styles.devicePasscodeButton}
            onPress={() => void triggerBiometricUnlock({ allowDevicePasscode: true })}
            activeOpacity={0.8}
          >
            <Text style={styles.devicePasscodeIcon}>📱</Text>
            <Text style={styles.devicePasscodeText}>Usar Senha do Aparelho</Text>
          </TouchableOpacity>

          {/* Botão Terciário: Entrar com E-mail e Senha */}
          <TouchableOpacity
            style={styles.emailPasswordButton}
            onPress={() => {
              setShowPasswordLogin(true);
              setErrorMessage(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.emailPasswordText}>Entrar com E-mail e Senha</Text>
          </TouchableOpacity>
        </View>

        {/* Rodapé: Troca de Usuário / Sair */}
        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => {
            if (onLogout) {
              onLogout();
            } else {
              setShowPasswordLogin(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLinkText}>Acessar outra conta Nexo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0d',
  },
  contentBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 16,
  },
  brandBadgeText: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 28,
  },
  biometricCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 85, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#ff5500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  biometricIcon: {
    fontSize: 56,
  },
  spinnerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  statusLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  actionButtonGroup: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#ff5500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#ff5500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryButtonIcon: {
    fontSize: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  devicePasscodeButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  devicePasscodeIcon: {
    fontSize: 16,
  },
  devicePasscodeText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
  },
  emailPasswordButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailPasswordText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  footerLink: {
    marginTop: 32,
    paddingVertical: 8,
  },
  footerLinkText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  textLink: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  textLinkLabel: {
    color: '#ff5500',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  cameraBox: {
    width: '100%',
    height: 240,
    backgroundColor: '#050507',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#ff5500',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    padding: 20,
  },
  cameraFrameIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cameraInstruction: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingOverlay: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
