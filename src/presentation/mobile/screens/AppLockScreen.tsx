/**
 * AppLockScreen.tsx — Tela de Bloqueio Seguro Bancário (Padrão Nubank, Inter, C6, Santander)
 *
 * Fluxo de Segurança:
 * 1. Ao abrir o app, dispara o Face ID / Sensor Biométrico IMEDIATAMENTE (sem exigir digitação de PIN).
 * 2. Se o Face ID for confirmado, entra direto no Dashboard em milissegundos.
 * 3. Se a biometria for cancelada ou não reconhecida, exibe a tela de fallback:
 *    - Botão direto para reativar o Face ID / Biometria com 1 toque.
 *    - Opção para usar a senha nativa do próprio celular (Device Passcode).
 *    - Teclado numérico bancário para PIN de 4 dígitos.
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
} from 'react-native';
import {
  BiometricSecurityService,
  type BiometricCapability,
} from '../../../core';

interface AppLockScreenProps {
  readonly userName: string;
  readonly onUnlockSuccess: () => void;
  readonly expectedPin?: string;
}

const PIN_LENGTH = 4;

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  userName,
  onUnlockSuccess,
  expectedPin = '1984',
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BiometricCapability | null>(null);
  const [isBiometricPending, setIsBiometricPending] = useState(false);
  const [authStage, setAuthStage] = useState<'AUTO_BIOMETRIC' | 'PIN_PAD'>('AUTO_BIOMETRIC');

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
      } else {
        // Se a biometria for cancelada ou falhar, alterna suavemente para a tela de PIN
        setAuthStage('PIN_PAD');
        if (result.isLeft()) {
          setErrorMessage(result.value.message);
        }
      }
    },
    [biometricService, isBiometricPending, onUnlockSuccess],
  );

  // Ao iniciar a tela, dispara a biometria nativa automaticamente (como Nubank / Inter)
  useEffect(() => {
    isMountedRef.current = true;
    let timer: NodeJS.Timeout | null = null;

    void biometricService.getCapabilities().then((cap) => {
      if (!isMountedRef.current) return;
      setCapabilities(cap);

      // Aguarda 150ms para que a janela nativa do app esteja montada e pronta
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

  const handleKeyPress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage(null);

      if (nextPin.length === PIN_LENGTH) {
        if (nextPin === expectedPin) {
          onUnlockSuccess();
        } else {
          setErrorMessage('PIN incorreto. Tente novamente.');
          setTimeout(() => setPin(''), 450);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const biometricLabel = capabilities?.shortLabel ?? 'Face ID';
  const biometricIcon = capabilities?.icon ?? '👤';

  // =========================================================================
  // ESTÁGIO 1: SPLASH BIOMÉTRICO AUTOMÁTICO (PADRÃO NUBANK / INTER)
  // =========================================================================
  if (authStage === 'AUTO_BIOMETRIC') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.autoBioContainer}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>NEXO BANK</Text>
          </View>

          <Text style={styles.greetingTitle}>Olá, {userName}</Text>
          <Text style={styles.subtitle}>Acessando sua conta protegida</Text>

          <TouchableOpacity
            style={styles.biometricCircleLarge}
            onPress={() => void triggerBiometricUnlock()}
            activeOpacity={0.8}
          >
            <Text style={styles.biometricIconLarge}>{biometricIcon}</Text>
            {isBiometricPending && (
              <ActivityIndicator
                size="large"
                color="#ff5500"
                style={styles.biometricSpinner}
              />
            )}
          </TouchableOpacity>

          <Text style={styles.autoBioStatus}>
            {isBiometricPending
              ? `Aguardando ${biometricLabel}...`
              : `Toque para autenticar com ${biometricLabel}`}
          </Text>

          <TouchableOpacity
            style={styles.fallbackTextButton}
            onPress={() => setAuthStage('PIN_PAD')}
            activeOpacity={0.7}
          >
            <Text style={styles.fallbackButtonLabel}>Entrar com PIN bancário →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // ESTÁGIO 2: TECLADO DE FALLBACK (PIN OU SENHA DO SISTEMA)
  // =========================================================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>NEXO BANK</Text>
        </View>
        <Text style={styles.greetingTitle}>Olá, {userName}</Text>
        <Text style={styles.subtitle}>
          Digite seu PIN de 4 dígitos ou use {biometricLabel}
        </Text>
      </View>

      {/* Indicadores de PIN (Dots) */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const filled = index < pin.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                errorMessage ? styles.dotError : null,
              ]}
            />
          );
        })}
      </View>

      {errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {/* Botões Rápidos de Acesso Alternativo */}
      <View style={styles.quickAccessRow}>
        <TouchableOpacity
          style={styles.quickAuthButton}
          onPress={() => void triggerBiometricUnlock()}
          activeOpacity={0.8}
        >
          <Text style={styles.quickAuthIcon}>{biometricIcon}</Text>
          <Text style={styles.quickAuthLabel}>Usar {biometricLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAuthButton}
          onPress={() => void triggerBiometricUnlock({ allowDevicePasscode: true })}
          activeOpacity={0.8}
        >
          <Text style={styles.quickAuthIcon}>📱</Text>
          <Text style={styles.quickAuthLabel}>Senha do Aparelho</Text>
        </TouchableOpacity>
      </View>

      {/* Teclado Numérico Bancário */}
      <View style={styles.keypad}>
        <View style={styles.keyRow}>
          {['1', '2', '3'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.keyButton}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {['4', '5', '6'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.keyButton}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {['7', '8', '9'].map((n) => (
            <TouchableOpacity
              key={n}
              style={styles.keyButton}
              onPress={() => handleKeyPress(n)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {/* Botão de Biometria Dinâmico */}
          <TouchableOpacity
            style={[styles.keyButton, styles.specialKeyButton]}
            onPress={() => void triggerBiometricUnlock()}
            disabled={isBiometricPending}
            activeOpacity={0.7}
          >
            <Text style={styles.specialKeyText}>{biometricIcon}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyButton}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          {/* Botão Apagar */}
          <TouchableOpacity
            style={[styles.keyButton, styles.specialKeyButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.specialKeyText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Recuperação de Acesso',
              'Por segurança bancária, o reset de PIN requer confirmação no e-mail cadastrado ou validação facial KYC.',
            )
          }
        >
          <Text style={styles.forgotPinText}>Esqueci meu PIN</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0d',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  autoBioContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  biometricCircleLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 85, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 36,
    position: 'relative',
  },
  biometricIconLarge: {
    fontSize: 52,
  },
  biometricSpinner: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  autoBioStatus: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  fallbackTextButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fallbackButtonLabel: {
    color: '#ff5500',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
  },
  brandBadgeText: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginVertical: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#374151',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#ff5500',
    borderColor: '#ff5500',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },
  quickAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickAuthIcon: {
    fontSize: 15,
  },
  quickAuthLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  keypad: {
    paddingHorizontal: 12,
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#ffffff',
  },
  specialKeyButton: {
    backgroundColor: 'transparent',
  },
  specialKeyText: {
    fontSize: 24,
    color: '#ff5500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPinText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
});
