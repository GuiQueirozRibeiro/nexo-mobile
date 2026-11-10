/**
 * AppLockScreen.tsx — Tela de Bloqueio Seguro com Face ID / Touch ID e PIN Bancário
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
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
  const [capabilities, setCapabilities] = useState<BiometricCapability | null>(
    null,
  );
  const [isBiometricPending, setIsBiometricPending] = useState(false);

  const biometricService = React.useMemo(
    () => new BiometricSecurityService(),
    [],
  );

  const triggerBiometricUnlock = useCallback(async () => {
    setIsBiometricPending(true);
    setErrorMessage(null);
    const result = await biometricService.authenticateAppUnlock();
    setIsBiometricPending(false);

    if (result.isRight() && result.value) {
      onUnlockSuccess();
    } else if (result.isLeft()) {
      setErrorMessage(result.value.message);
    }
  }, [biometricService, onUnlockSuccess]);

  useEffect(() => {
    let isMounted = true;
    void biometricService.getCapabilities().then((cap) => {
      if (isMounted) {
        setCapabilities(cap);
        if (cap.hasHardware && cap.isEnrolled) {
          void triggerBiometricUnlock();
        }
      }
    });
    return () => {
      isMounted = false;
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
          setTimeout(() => setPin(''), 400);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const isFaceId = capabilities?.primaryType === 'FACIAL_RECOGNITION';
  const biometricLabel = isFaceId ? 'Face ID' : 'Digital';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>NEXO BANK</Text>
        </View>
        <Text style={styles.greetingTitle}>Olá, {userName}</Text>
        <Text style={styles.subtitle}>
          Insira seu PIN de 4 dígitos ou use {biometricLabel}
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
          {/* Botão de Biometria / Face ID */}
          <TouchableOpacity
            style={[styles.keyButton, styles.specialKeyButton]}
            onPress={() => void triggerBiometricUnlock()}
            disabled={isBiometricPending}
            activeOpacity={0.7}
          >
            <Text style={styles.specialKeyText}>
              {isFaceId ? '👤' : '👆'}
            </Text>
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
    backgroundColor: '#0b0c0e',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
  },
  brandBadge: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#8e929a',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginVertical: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#2b2f38',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: '#ff5500',
    backgroundColor: '#ff5500',
  },
  dotError: {
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 14,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#15171c',
    borderWidth: 1,
    borderColor: '#21242d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#ffffff',
  },
  specialKeyButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  specialKeyText: {
    fontSize: 22,
    color: '#ff5500',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  forgotPinText: {
    color: '#8e929a',
    fontSize: 12,
    fontWeight: '500',
  },
});
